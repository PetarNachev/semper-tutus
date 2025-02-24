"""Add encryption fields to user

Revision ID: 960fccea0c52
Revises: 5fed44112dfd
Create Date: 2025-02-22 15:55:21.659223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.core.encryption import generate_salt, generate_master_key, encrypt_master_key

# revision identifiers, used by Alembic.
revision: str = '960fccea0c52'
down_revision: Union[str, None] = '5fed44112dfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('encryption_salt', sa.String(), nullable=True))
    op.add_column('users', sa.Column('encrypted_master_key', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'encrypted_master_key')
    op.drop_column('users', 'encryption_salt')
    # ### end Alembic commands ###
