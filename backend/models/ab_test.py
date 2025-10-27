from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from enum import Enum

class TestStatus(str, Enum):
    """A/B測試狀態"""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class ModelConfig(BaseModel):
    """模型配置"""
    model_id: str
    model_name: str
    provider: str  # openai, anthropic, cohere, etc.
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    
class PromptVariant(BaseModel):
    """Prompt變體"""
    variant_id: str
    variant_name: str
    prompt_template: str
    system_prompt: Optional[str] = None
    variables: Dict[str, str] = Field(default_factory=dict)
    
class TrafficAllocation(BaseModel):
    """流量分配配置"""
    variant_id: str
    model_id: str
    allocation_percentage: float  # 0-100
    
class TestResult(BaseModel):
    """單次測試結果"""
    result_id: str
    test_id: str
    variant_id: str
    model_id: str
    input_data: Dict
    generated_output: str
    timestamp: datetime
    
    # 性能指標
    generation_time_ms: float
    total_tokens: int
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    
    # 質量指標
    user_rating: Optional[float] = None  # 1-5星
    user_feedback: Optional[str] = None
    auto_score: Optional[float] = None  # 自動評分
    comparison_winner: Optional[bool] = None
    
    # 錯誤追蹤
    error: Optional[str] = None
    status: str = "success"  # success, error, timeout

class AggregateMetrics(BaseModel):
    """聚合指標"""
    variant_id: str
    model_id: str
    
    # 執行統計
    total_runs: int = 0
    success_runs: int = 0
    error_runs: int = 0
    
    # 性能統計
    avg_generation_time_ms: float = 0.0
    p50_generation_time_ms: float = 0.0
    p95_generation_time_ms: float = 0.0
    p99_generation_time_ms: float = 0.0
    
    # Token統計
    total_tokens_used: int = 0
    avg_tokens_per_run: float = 0.0
    
    # 成本統計
    total_cost_usd: float = 0.0
    avg_cost_per_run: float = 0.0
    
    # 質量統計
    avg_user_rating: Optional[float] = None
    win_rate: Optional[float] = None  # 勝率 (在比對中獲勝的百分比)
    user_preference_rate: Optional[float] = None
    avg_auto_score: Optional[float] = None

class ABTest(BaseModel):
    """A/B測試配置"""
    test_id: str
    test_name: str
    description: Optional[str] = None
    
    # 測試配置
    prompt_variants: List[PromptVariant]
    model_configs: List[ModelConfig]
    traffic_allocation: List[TrafficAllocation]
    
    # 測試參數
    sample_size: int = 100  # 預計執行次數
    parallel_execution: bool = True
    
    # 狀態管理
    status: TestStatus = TestStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # 創建者
    created_by: str
    
    # 結果追蹤
    results: List[TestResult] = Field(default_factory=list)
    aggregate_metrics: List[AggregateMetrics] = Field(default_factory=list)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ComparisonPair(BaseModel):
    """結果比對配對"""
    comparison_id: str
    test_id: str
    result_a_id: str
    result_b_id: str
    
    # 用戶評分
    user_preference: Optional[str] = None  # "a", "b", "tie"
    rating_dimensions: Dict[str, float] = Field(default_factory=dict)  # 多維度評分
    feedback: Optional[str] = None
    rated_at: Optional[datetime] = None
    rated_by: Optional[str] = None
    
class ABTestReport(BaseModel):
    """A/B測試報告"""
    report_id: str
    test_id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # 測試摘要
    test_summary: Dict
    
    # 總體統計
    overall_stats: Dict
    
    # 各組性能
    variant_performance: List[Dict]
    
    # 勝者分析
    winner_analysis: Dict
    
    # 成本效益分析
    cost_benefit_analysis: Dict
    
    # 統計顯著性
    statistical_significance: Dict
    
    # 建議
    recommendations: List[str]
