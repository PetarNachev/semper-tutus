"""create_folders_table

Revision ID: 03bf09abb45e
Revises: 960fccea0c52
Create Date: 2025-02-28 17:12:23.682490

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '03bf09abb45e'
down_revision = '960fccea0c52'
branch_labels = None
depends_on = None

def upgrade():
    # Create folders table first
    op.create_table('folders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add the self-referential foreign key in a separate step
    op.create_foreign_key(
        'fk_folders_parent_id_folders',
        'folders', 'folders',
        ['parent_id'], ['id']
    )
    
    # Add the user foreign key
    op.create_foreign_key(
        'fk_folders_user_id_users',
        'folders', 'users',
        ['user_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_folders_user_id_users', 'folders', type_='foreignkey')
    op.drop_constraint('fk_folders_parent_id_folders', 'folders', type_='foreignkey')
    op.drop_table('folders')
