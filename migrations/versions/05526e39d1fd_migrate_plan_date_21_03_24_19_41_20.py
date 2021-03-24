""" - Migrate Plan Date: 21/03/24-19:41:20

Revision ID: 05526e39d1fd
Revises: 8dd0f87db099
Create Date: 2021-03-24 13:41:21.641384

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '05526e39d1fd'
down_revision = '8dd0f87db099'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('appointments', sa.Column('emp_accepted', sa.Boolean(), nullable=True))
    op.add_column('catalog_id_document_types', sa.Column('enabled', sa.Boolean(), nullable=True))
    op.add_column('catalog_id_document_types', sa.Column('length', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('catalog_id_document_types', 'length')
    op.drop_column('catalog_id_document_types', 'enabled')
    op.drop_column('appointments', 'emp_accepted')
    # ### end Alembic commands ###
