---
title: "CV"
permalink: /cv/
excerpt: "Curriculum vitae of Ziyi Zhang."
redirect_from:
  - /resume
# The list beside the text on wide screens. The entries themselves are in _data/cv.yml.
sections:
  - id: education
    title: Education
  - id: experience
    title: Experience
  - id: publications
    title: Publications
  - id: teaching
    title: Teaching
  - id: skills
    title: Skills
---

{% include base_path %}

{% comment %} The download button appears only once files/CV_Ziyi_Zhang.pdf exists. {% endcomment %}
{% assign cv_pdf = site.static_files | where: "path", "/files/CV_Ziyi_Zhang.pdf" | first %}

<header class="page-heading">
<h1 class="page-heading__title">Curriculum Vitae</h1>
{% if cv_pdf %}<p><a class="pill pill--large" href="{{ base_path }}{{ cv_pdf.path }}">Download PDF</a></p>{% endif %}
</header>

<section class="section" id="education">
<h2 class="section__title">Education</h2>
{% include cv/education.html %}
</section>

<section class="section" id="experience">
<h2 class="section__title">Experience</h2>
{% include cv/experience.html %}
</section>

<section class="section" id="publications">
<h2 class="section__title">Publications</h2>
{% include cv/publications.html %}
</section>

<section class="section" id="teaching">
<h2 class="section__title">Teaching</h2>
{% include cv/teaching.html %}
</section>

<section class="section" id="skills">
<h2 class="section__title">Skills</h2>
{% include cv/skills.html %}
</section>
