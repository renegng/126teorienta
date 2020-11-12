#!/usr/bin/python
import sys
import logging

logging.basicConfig(stream=sys.stderr)
sys.path.insert(0,"/var/www/126teorienta.rxdbit.com/126teorienta/")

from swing_main import app as application
