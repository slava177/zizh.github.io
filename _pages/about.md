---
permalink: /
title: "Ziyi Zhang"
excerpt: "PhD student in Electrical and Computer Engineering at Carnegie Mellon University, working on stochastic control, reinforcement learning and diffusion models."
redirect_from:
  - /about/
  - /about.html
# The list beside the text on wide screens (and on the CV and paper pages, leading back
# here). Each id is a <section> below, which the list jumps to.
sections:
  - id: about
    title: About Me
  - id: publications
    title: Publications
  - id: experience
    title: Experience
  - id: teaching
    title: Teaching
---

{% include base_path %}

<section class="section prose" id="about" markdown="1">
<h2 class="section__title">About Me</h2>

I am a fifth-year PhD student at Carnegie Mellon University studying Electrical and Computer Engineering, advised by Prof. [Guannan Qu](https://www.guannanqu.com/) and Prof. Yorie Nakahira. I obtained my M.S. degree at Duke University in Computer Science in 2022. I obtained my B.S. degree in Honors math and computer science at University of Michigan, Ann Arbor, in 2021.

My current research interests are in stochastic control, reinforcement learning, and diffusion models. I study how to learn and control unknown dynamical systems with provable guarantees, and I work on both the theory and the applications of diffusion models, from their convergence on manifolds to topology-aware 3D generation. More broadly, I am interested in graph theory, algebraic topology and their applications in machine learning.

<div class="elsewhere">
  <a href="{{ base_path }}/travel/"><img src="{{ base_path }}/images/travel/small/2023-07-22-machu-picchu-800.jpg" alt="" style="object-position: 50% 55%"><span class="name">Travel <span aria-hidden="true">&rarr;</span></span></a>
  <a href="{{ base_path }}/models/"><img src="{{ base_path }}/images/models/small/2024-07-28-mary-rose-800.jpg" alt="" style="object-position: 50% 40%"><span class="name">Scale Models <span aria-hidden="true">&rarr;</span></span></a>
</div>
</section>

<section class="section" id="publications">
<h2 class="section__title">Publications</h2>
<p class="section__note">Also on <a href="{{ site.author.googlescholar }}">Google Scholar</a>.</p>
{% include publications.html %}
</section>

<section class="section" id="experience">
<h2 class="section__title">Experience</h2>
{% include cv/experience.html brief=true %}
<p class="section__more"><a href="{{ base_path }}/cv/">Full CV <span aria-hidden="true">&rarr;</span></a></p>
</section>

<section class="section" id="teaching">
<h2 class="section__title">Teaching</h2>
{% include cv/teaching.html %}
</section>
