from flask import Blueprint, render_template, current_app, make_response
import datetime

seo = Blueprint('seo', __name__, template_folder='templates', static_folder='static')

# SEO - Serve robots.txt
@seo.route('/robots.txt', methods=['GET'])
def seo_robots():
    return current_app.send_static_file('robots.txt')

# SEO - Serve sitemap.xml
@seo.route('/sitemap.xml', methods=['GET'])
def seo_sitemap():
      # Generate sitemap.xml. Makes a list of urls and date modified.
      pages = []
      datemodified = datetime.date(2019, 5, 5).isoformat()
      
      # static pages
      for rule in current_app.url_map.iter_rules():
          if "GET" in rule.methods and len(rule.arguments) == 0:
              pages.append([rule.rule, datemodified])
      
      sitemap_xml = render_template('sitemap_template.xml', pages = pages)
      response = make_response(sitemap_xml)
      response.headers["Content-Type"] = "application/xml"    
    
      return response