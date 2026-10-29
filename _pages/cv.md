---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

{% comment %} The download button appears only once files/CV_Ziyi_Zhang.pdf exists. {% endcomment %}
{% assign cv_pdf = site.static_files | where: "path", "/files/CV_Ziyi_Zhang.pdf" | first %}
{% if cv_pdf %}
<a class="btn" href="{{ base_path }}{{ cv_pdf.path }}"><i class="fas fa-file-pdf" aria-hidden="true"></i> Download CV (PDF)</a>
{% endif %}

Education
======
* Ph.D. in Electrical and Computer Engineering, Carnegie Mellon University, expected Jan 2027
* M.S. in Computer Science, Duke University, 2022
* B.S. in Mathematics & Computer Science, University of Michigan, 2021

Work experience
======
* Summer 2026: Software Engineer Intern (Gmail Ads)
  * Google LLC, Sunnyvale, CA
  * Built an LLM-based agentic system to adjust bidding parameters produced by the hidden distribution model for impressions.
  * By modeling bidding as a Markov Decision Process, the system aims to use the LLM's reasoning ability to adjust the range of maximal bidding prices on a daily basis.
  * Used knowledge agent, critic agent, and Thompson sampling to select the most valuable knowledge on a weekly basis.
  * For the selected adgroups, the desired-spend-over-spend (DSoS) moved closer to 1 by about 0.03, with reduced variance in daily DSoS fluctuations.

* Summer 2025: AI System Intern
  * Aira Technologies Inc., Saratoga, CA
  * Designed and implemented an agentic LLM network for root cause analysis (RCA) in AT&T network.
  * Implemented an agentic system using LangGraph with a team of researcher LLMs each focusing on different elements of KPI, alarms, and tickets. The team is led by a supervisor LLM, which produces the final report.
  * Used GraphDB to build the knowledge graphs for the researcher LLMs to identify the root cause more accurately. 
  * Improved the accuracy of RCA from 30% in the prototype version to 85% in the production version.

* Summer 2020: Software Engineer
  * Guochuang Software Co. 
  * Designed a commercial website using HTML and JavaScript.
  * Redesigned the database structure in order to scale up the system’s capacity to handle larger number of transactions.

Publications
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>

Teaching
======
* 18-667: Algorithms for Large-scale Distributed Machine Learning and Optimization

Skills
======
* Programming languages: C++ (3 years), Java (3 years), Python (7 years)
* Databases: Oracle (1 year), SQL (1 year), MongoDB (1 year)
* Math coursework: Stochastic Calculus, Real Analysis, Functional Analysis, Partial Differential Equations, Graph Theory
* Data science: Statistical Analysis, Regression
* Computer science: Numerical Methods, Reinforcement Learning, Deep Learning
