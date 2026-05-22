"""Add student career intelligence models

Revision ID: a63d9f54f2a1
Revises: 5fdeea38ce8f
Create Date: 2026-05-22 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a63d9f54f2a1"
down_revision: Union[str, Sequence[str], None] = "5fdeea38ce8f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_skills",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("skill_name", sa.String(), nullable=False),
        sa.Column("proficiency_level", sa.String(), nullable=False),
        sa.Column("years_experience", sa.Float(), nullable=True),
        sa.Column("evidence", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "skill_name", name="uq_student_skill_name"),
    )
    op.create_index(op.f("ix_student_skills_id"), "student_skills", ["id"], unique=False)
    op.create_index(op.f("ix_student_skills_skill_name"), "student_skills", ["skill_name"], unique=False)
    op.create_index(op.f("ix_student_skills_student_id"), "student_skills", ["student_id"], unique=False)

    op.create_table(
        "student_certifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("issuer", sa.String(), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("credential_url", sa.String(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_student_certifications_id"), "student_certifications", ["id"], unique=False)
    op.create_index(op.f("ix_student_certifications_student_id"), "student_certifications", ["student_id"], unique=False)

    op.create_table(
        "student_internships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("company_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("impact_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_student_internships_id"), "student_internships", ["id"], unique=False)
    op.create_index(op.f("ix_student_internships_student_id"), "student_internships", ["student_id"], unique=False)

    op.create_table(
        "student_projects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("repo_url", sa.String(), nullable=True),
        sa.Column("live_url", sa.String(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("complexity_level", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_student_projects_id"), "student_projects", ["id"], unique=False)
    op.create_index(op.f("ix_student_projects_student_id"), "student_projects", ["student_id"], unique=False)

    op.create_table(
        "student_resumes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("stored_filename", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stored_filename"),
    )
    op.create_index(op.f("ix_student_resumes_id"), "student_resumes", ["id"], unique=False)
    op.create_index(op.f("ix_student_resumes_student_id"), "student_resumes", ["student_id"], unique=False)

    op.create_table(
        "readiness_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("company_name", sa.String(), nullable=True),
        sa.Column("readiness_score", sa.Float(), nullable=False),
        sa.Column("readiness_label", sa.String(), nullable=False),
        sa.Column("eligible", sa.Boolean(), nullable=False),
        sa.Column("matched_skills", sa.JSON(), nullable=True),
        sa.Column("missing_skills", sa.JSON(), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("recommendations", sa.JSON(), nullable=True),
        sa.Column("roadmap", sa.JSON(), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_readiness_reports_id"), "readiness_reports", ["id"], unique=False)
    op.create_index(op.f("ix_readiness_reports_student_id"), "readiness_reports", ["student_id"], unique=False)
    op.create_index(op.f("ix_readiness_reports_company_id"), "readiness_reports", ["company_id"], unique=False)
    op.create_index(op.f("ix_readiness_reports_company_name"), "readiness_reports", ["company_name"], unique=False)

    op.create_table(
        "improvement_recommendations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("readiness_report_id", sa.Integer(), nullable=False),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("target_skills", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["readiness_report_id"], ["readiness_reports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_improvement_recommendations_id"), "improvement_recommendations", ["id"], unique=False)
    op.create_index(
        op.f("ix_improvement_recommendations_readiness_report_id"),
        "improvement_recommendations",
        ["readiness_report_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_improvement_recommendations_readiness_report_id"), table_name="improvement_recommendations")
    op.drop_index(op.f("ix_improvement_recommendations_id"), table_name="improvement_recommendations")
    op.drop_table("improvement_recommendations")
    op.drop_index(op.f("ix_readiness_reports_company_name"), table_name="readiness_reports")
    op.drop_index(op.f("ix_readiness_reports_company_id"), table_name="readiness_reports")
    op.drop_index(op.f("ix_readiness_reports_student_id"), table_name="readiness_reports")
    op.drop_index(op.f("ix_readiness_reports_id"), table_name="readiness_reports")
    op.drop_table("readiness_reports")
    op.drop_index(op.f("ix_student_resumes_student_id"), table_name="student_resumes")
    op.drop_index(op.f("ix_student_resumes_id"), table_name="student_resumes")
    op.drop_table("student_resumes")
    op.drop_index(op.f("ix_student_projects_student_id"), table_name="student_projects")
    op.drop_index(op.f("ix_student_projects_id"), table_name="student_projects")
    op.drop_table("student_projects")
    op.drop_index(op.f("ix_student_internships_student_id"), table_name="student_internships")
    op.drop_index(op.f("ix_student_internships_id"), table_name="student_internships")
    op.drop_table("student_internships")
    op.drop_index(op.f("ix_student_certifications_student_id"), table_name="student_certifications")
    op.drop_index(op.f("ix_student_certifications_id"), table_name="student_certifications")
    op.drop_table("student_certifications")
    op.drop_index(op.f("ix_student_skills_student_id"), table_name="student_skills")
    op.drop_index(op.f("ix_student_skills_skill_name"), table_name="student_skills")
    op.drop_index(op.f("ix_student_skills_id"), table_name="student_skills")
    op.drop_table("student_skills")
