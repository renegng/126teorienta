import sys, os

from datetime import datetime as dt
from datetime import timezone as tz
from flask import Flask
from flask_migrate import Migrate
from models import *
from populatedb import initPopulateDB, initPopulateES, populateTable
from pathlib import Path

# Enables Flask instance 
app = Flask(__name__)

# Configuration file from environment variable
app.config['ENV'] = 'development'
app.config['DEBUG'] = True
sys.path.append((Path(__file__).parent.parent.resolve() / 'instance').as_posix())
from config_models import configType as cfgmodels
app.config.from_object(cfgmodels[app.config['ENV']])

# Enable instance of SQLAlchemy
db.init_app(app)

# Enable instance of Migrate-Alembic
migrate = Migrate(app, db)

# Init CryptoKey
crypto_key.key = app.config['SECRET_KEY']

# Init Elasticsearch
es.init_app(app)

def main(argv):
    #Database DDL
    with app.app_context():
        # At least one parameter has been received
        if len(argv) > 1:

            # Creates all Database Tables
            if argv[1] == "create_all":
                print("Executing SQLAlchemy create_all")
                db.create_all()
                initPopulateDB()

            # Drops all Database Tables
            elif argv[1] == "drop_all":
                print("Executing SQLAlchemy drop_all")
                db.drop_all()
            
            # Elastic Search indexing commands
            elif argv[1] == "elastic_reindex":
                print("Executing ElasticSearch Indexing")
                initPopulateES()
            
            # Flask Migrate commands
            elif argv[1] == "migrate":
                print("For Migrate-Alembic commands execute the following:")
                print("[migrate_init | migrate_prepare | migrate_upgrade]")

            # Flask Migrate commands
            elif argv[1] == "migrate_init":
                os.putenv('PYTHONPATH', '${{PYTHONPATH}}:{}/'.format(Path(__file__).parent.resolve()))
                os.putenv('FLASK_APP', Path(__file__))
                os.system('flask db init')

            # Flask Migrate commands
            elif argv[1] == "migrate_prepare":
                os.putenv('PYTHONPATH', '${{PYTHONPATH}}:{}/'.format(Path(__file__).parent.resolve()))
                os.putenv('FLASK_APP', Path(__file__))
                dt_now = dt.now(tz.utc)
                os.system('flask db migrate -m " - Migrate Plan Date: {}"'.format(dt_now.strftime('%y/%m/%d-%H:%M:%S')))

            # Flask Migrate commands
            elif argv[1] == "migrate_upgrade":
                os.putenv('PYTHONPATH', '${{PYTHONPATH}}:{}/'.format(Path(__file__).parent.resolve()))
                os.putenv('FLASK_APP', Path(__file__))
                os.system('flask db upgrade')
            
            # Populate specific Database Tables
            elif argv[1] == "populate_db":
                print("Executing SQLAlchemy Inserts")
                if len(argv) == 3:
                    populateTable(argv[2])
                elif len(argv) == 4:
                    populateTable(argv[2], argv[3])
                else:
                    print("No table specified. Command supported:")
                    print("$ python3 ddl.py populate_db data_procedure_name [options]")

            else:
                print("Command not supported")

        else:
            print("No command specified. Commands supported:")
            print("$ python3 ddl.py [create_all | drop_all | populate_db | migrate | elastic_reindex]")


# Executes main() function if this file is executed as "__main__"
if __name__ == "__main__":
    main(sys.argv)