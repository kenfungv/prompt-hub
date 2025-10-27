import uuid
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel

from ..models.ab_test import (
    ABTest,
    TestStatus,
    TestResult,
    AggregateMetrics,
    ComparisonPair,
    ABTestReport,
)

class ABTestController:
    """A/B測試核心控制器：負責創建、執行、聚合與報告"""

    def __init__(self, storage):
        # storage 需實作簡單CRUD介面 (e.g., DB或本地JSON)
        self.storage = storage

    # ------------ 測試生命周期 ------------
    def create_test(self, payload: Dict, created_by: str) -> ABTest:
        test = ABTest(
            test_id=str(uuid.uuid4()),
            test_name=payload.get("test_name", "Untitled AB Test"),
            description=payload.get("description"),
            prompt_variants=payload["prompt_variants"],
            model_configs=payload["model_configs"],
            traffic_allocation=payload["traffic_allocation"],
            sample_size=payload.get("sample_size", 100),
            parallel_execution=payload.get("parallel_execution", True),
            status=TestStatus.DRAFT,
            created_by=created_by,
        )
        self.storage.save_test(test)
        return test

    def start_test(self, test_id: str) -> ABTest:
        test: ABTest = self.storage.get_test(test_id)
        test.status = TestStatus.RUNNING
        test.started_at = datetime.utcnow()
        self.storage.save_test(test)
        return test

    def pause_test(self, test_id: str) -> ABTest:
        test: ABTest = self.storage.get_test(test_id)
        test.status = TestStatus.PAUSED
        self.storage.save_test(test)
        return test

    def complete_test(self, test_id: str) -> ABTest:
        test: ABTest = self.storage.get_test(test_id)
        test.status = TestStatus.COMPLETED
        test.completed_at = datetime.utcnow()
        self.storage.save_test(test)
        return test

    # ------------ 結果記錄 ------------
    def record_result(
        self,
        test_id: str,
        variant_id: str,
        model_id: str,
        input_data: Dict,
        generated_output: str,
        generation_time_ms: float,
        total_tokens: int,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: float,
        status: str = "success",
        error: Optional[str] = None,
        user_rating: Optional[float] = None,
        user_feedback: Optional[str] = None,
        auto_score: Optional[float] = None,
        comparison_winner: Optional[bool] = None,
    ) -> TestResult:
        test: ABTest = self.storage.get_test(test_id)
        result = TestResult(
            result_id=str(uuid.uuid4()),
            test_id=test_id,
            variant_id=variant_id,
            model_id=model_id,
            input_data=input_data,
            generated_output=generated_output,
            timestamp=datetime.utcnow(),
            generation_time_ms=generation_time_ms,
            total_tokens=total_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=cost_usd,
            status=status,
            error=error,
            user_rating=user_rating,
            user_feedback=user_feedback,
            auto_score=auto_score,
            comparison_winner=comparison_winner,
        )
        test.results.append(result)
        self.storage.save_test(test)
        return result

    # ------------ 聚合運算 ------------
    def aggregate_metrics(self, test_id: str) -> List[AggregateMetrics]:
        import statistics

        test: ABTest = self.storage.get_test(test_id)
        groups: Dict[tuple, List[TestResult]] = {}
        for r in test.results:
            key = (r.variant_id, r.model_id)
            groups.setdefault(key, []).append(r)

        aggregates: List[AggregateMetrics] = []
        for (variant_id, model_id), results in groups.items():
            times = [r.generation_time_ms for r in results if r.status == "success"]
            tokens = [r.total_tokens for r in results if r.status == "success"]
            costs = [r.cost_usd for r in results if r.status == "success"]
            ratings = [r.user_rating for r in results if r.user_rating is not None]
            wins = [1 if r.comparison_winner else 0 for r in results if r.comparison_winner is not None]
            auto_scores = [r.auto_score for r in results if r.auto_score is not None]

            agg = AggregateMetrics(
                variant_id=variant_id,
                model_id=model_id,
                total_runs=len(results),
                success_runs=len([r for r in results if r.status == "success"]),
                error_runs=len([r for r in results if r.status != "success"]),
                avg_generation_time_ms=(sum(times) / len(times)) if times else 0.0,
                p50_generation_time_ms=statistics.median(times) if times else 0.0,
                p95_generation_time_ms=(statistics.quantiles(times, n=100)[94] if len(times) >= 100 else (sorted(times)[int(0.95*(len(times)-1))] if times else 0.0)),
                p99_generation_time_ms=(statistics.quantiles(times, n=100)[98] if len(times) >= 100 else (sorted(times)[int(0.99*(len(times)-1))] if times else 0.0)),
                total_tokens_used=sum(tokens) if tokens else 0,
                avg_tokens_per_run=(sum(tokens) / len(tokens)) if tokens else 0.0,
                total_cost_usd=sum(costs) if costs else 0.0,
                avg_cost_per_run=(sum(costs) / len(costs)) if costs else 0.0,
                avg_user_rating=(sum(ratings) / len(ratings)) if ratings else None,
                win_rate=(sum(wins) / len(wins)) if wins else None,
                user_preference_rate=(sum(wins) / len(results)) if results else None,
                avg_auto_score=(sum(auto_scores) / len(auto_scores)) if auto_scores else None,
            )
            aggregates.append(agg)

        test.aggregate_metrics = aggregates
        self.storage.save_test(test)
        return aggregates

    # ------------ 結果配對與用戶評分 ------------
    def create_comparison_pair(self, test_id: str, result_a_id: str, result_b_id: str) -> ComparisonPair:
        pair = ComparisonPair(
            comparison_id=str(uuid.uuid4()),
            test_id=test_id,
            result_a_id=result_a_id,
            result_b_id=result_b_id,
        )
        self.storage.save_comparison_pair(pair)
        return pair

    def submit_user_rating(
        self,
        comparison_id: str,
        user_preference: str,
        rating_dimensions: Dict[str, float],
        feedback: Optional[str],
        rated_by: str,
    ) -> ComparisonPair:
        pair: ComparisonPair = self.storage.get_comparison_pair(comparison_id)
        pair.user_preference = user_preference
        pair.rating_dimensions = rating_dimensions
        pair.feedback = feedback
        pair.rated_at = datetime.utcnow()
        pair.rated_by = rated_by
        self.storage.save_comparison_pair(pair)
        return pair

    # ------------ 報告生成 ------------
    def generate_report(self, test_id: str) -> ABTestReport:
        test: ABTest = self.storage.get_test(test_id)
        aggregates = test.aggregate_metrics or self.aggregate_metrics(test_id)

        # 簡化版顯著性與勝者分析（可替換為更嚴謹統計方法）
        by_variant: Dict[str, List[AggregateMetrics]] = {}
        for a in aggregates:
            by_variant.setdefault(a.variant_id, []).append(a)

        winner_analysis = {}
        for variant_id, items in by_variant.items():
            # 以win_rate為主要指標，次指標user_rating
            best = sorted(
                items,
                key=lambda x: (
                    x.win_rate or 0,
                    x.avg_user_rating or 0,
                    -(x.avg_cost_per_run or 0),
                    -(x.avg_generation_time_ms or 0),
                ),
                reverse=True,
            )[0]
            winner_analysis[variant_id] = best.model_id

        overall_stats = {
            "total_runs": sum(a.total_runs for a in aggregates),
            "total_cost_usd": sum(a.total_cost_usd for a in aggregates),
            "avg_cost_per_run": sum(a.avg_cost_per_run for a in aggregates) / len(aggregates) if aggregates else 0,
        }

        report = ABTestReport(
            report_id=str(uuid.uuid4()),
            test_id=test_id,
            test_summary={
                "name": test.test_name,
                "status": test.status,
                "prompt_variants": len(test.prompt_variants),
                "model_configs": len(test.model_configs),
                "sample_size": test.sample_size,
            },
            overall_stats=overall_stats,
            variant_performance=[a.dict() for a in aggregates],
            winner_analysis=winner_analysis,
            cost_benefit_analysis={},
            statistical_significance={},
            recommendations=[],
        )
        self.storage.save_report(report)
        return report
