"""add_folder_id_to_notes_clean

Revision ID: 2e1876a2ef8f
Revises: 03bf09abb45e
Create Date: 2025-02-28 17:33:05.573239

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e1876a2ef8f'
down_revision: Union[str, None] = '03bf09abb45e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # First add the column without constraints
    op.add_column('notes', sa.Column('folder_id', sa.Integer(), nullable=True))
    
    # Then add the foreign key constraint
    op.create_foreign_key(
        'fk_notes_folder_id', 'notes', 'folders',
        ['folder_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_notes_folder_id', 'notes', type_='foreignkey')
    op.drop_column('notes', 'folder_id')
