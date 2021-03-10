""" - Migrate Plan Date: 21/03/10-03:24:59

Revision ID: 8dd0f87db099
Revises: 
Create Date: 2021-03-09 21:25:00.387245

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8dd0f87db099'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('catalog_id_document_types',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=60), nullable=False),
    sa.Column('name_short', sa.String(length=6), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name'),
    sa.UniqueConstraint('name_short')
    )
    op.add_column('catalog_services', sa.Column('sessions_schedule', sa.JSON(), nullable=True))
    op.add_column('user_extra_info', sa.Column('alias', sa.String(length=300), nullable=True))
    op.add_column('user_extra_info', sa.Column('national_id', sa.String(length=30), nullable=True))
    op.add_column('user_extra_info', sa.Column('national_id_type', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'user_extra_info', 'catalog_id_document_types', ['national_id_type'], ['id'])
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'user_extra_info', type_='foreignkey')
    op.drop_column('user_extra_info', 'national_id_type')
    op.drop_column('user_extra_info', 'national_id')
    op.drop_column('user_extra_info', 'alias')
    op.drop_column('catalog_services', 'sessions_schedule')
    op.drop_table('catalog_id_document_types')
    # ### end Alembic commands ###
