# Pass 4 – Data truth
Migrations:
20260403_portal_schema.sql
20260505_progress_system.sql
20260505_unique_constraints.sql
20260506_ai_quiz.sql
20260506_habit_system.sql
20260508_documents.sql
20260508_vector.sql
20260510_vector_scaling.sql
20260511_security_hardening.sql
20260524_analytics_observability.sql
20260527_ai_literacy_units.sql
20260527_analytics_integrity.sql
20260527_operational_intelligence_views.sql
20260528_ai_literacy_resume_fields.sql
20260530_ai_literacy_mastery_unit3.sql
20260530_ai_literacy_weakest_section.sql
20260531_practice_sessions.sql
20260531_question_bank.sql
20260531_subject_mastery.sql
20260603_learning_recommendations.sql
20260603_performance_profiles.sql
20260604_learning_trend_snapshots.sql
20260606_learning_identity_graph.sql
20260606_learning_interventions.sql
20260606_learning_plans.sql
20260606_learning_risk_predictions.sql
20260607_learning_coach_reports.sql
20260701_adaptive_learning_paths.sql
20260701_learning_retention_profiles.sql
20260912_polymath.sql
20260912_product_hardening.sql
20260915_governed_cloud_sync.sql
20261102_learning_evidence.sql
20261102_learning_evidence_v2.sql
run-all.sql
Tables referenced in code:
from('ai_call_logs')
from('ai_literacy_content')
from('ai_literacy_progress')
from('cached_roadmaps')
from('learning_identities')
from('learning_interventions')
from('learning_retention_profiles')
from('learning_risk_predictions')
from('performance_profiles')
from('practice_sessions')
from('profiles')
from('question_bank')
from('quiz_sessions')
from('topics')
from('user_events')
from('user_progress')
RLS check:
supabase/migrations/20260531_subject_mastery.sql:ALTER TABLE public.subject_mastery ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260603_performance_profiles.sql:ALTER TABLE public.performance_profiles ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260403_portal_schema.sql:ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260403_portal_schema.sql:ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260403_portal_schema.sql:ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260527_ai_literacy_units.sql:ALTER TABLE ai_literacy_content ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260527_ai_literacy_units.sql:ALTER TABLE ai_literacy_progress ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_polymath.sql:ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_polymath.sql:ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260915_governed_cloud_sync.sql:    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
supabase/migrations/20260603_learning_recommendations.sql:ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260531_question_bank.sql:ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260524_analytics_observability.sql:ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260524_analytics_observability.sql:ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260511_security_hardening.sql:ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260511_security_hardening.sql:ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260511_security_hardening.sql:ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260607_learning_coach_reports.sql:ALTER TABLE learning_coach_reports ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE cached_roadmaps ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
supabase/migrations/run-all.sql:    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
supabase/migrations/20260606_learning_identity_graph.sql:ALTER TABLE learning_identities ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260606_learning_identity_graph.sql:ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260606_learning_identity_graph.sql:ALTER TABLE knowledge_paths ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260604_learning_trend_snapshots.sql:ALTER TABLE public.learning_trend_snapshots ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_product_hardening.sql:ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_product_hardening.sql:ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_product_hardening.sql:ALTER TABLE cached_roadmaps ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_product_hardening.sql:ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_product_hardening.sql:ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260912_product_hardening.sql:ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260531_practice_sessions.sql:ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
