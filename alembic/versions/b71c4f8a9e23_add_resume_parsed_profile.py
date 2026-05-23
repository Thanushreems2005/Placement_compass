"""Add parsed resume profile metadata

Revision ID: b71c4f8a9e23
Revises: a63d9f54f2a1
Create Date: 2026-05-23 01:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b71c4f8a9e23"
down_revision: Union[str, Sequence[str], None] = "a63d9f54f2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("student_resumes", sa.Column("parsed_profile", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("student_resumes", "parsed_profile")
