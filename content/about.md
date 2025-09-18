---
title: "About This Site"
description: "Learn more about the philosophy, technology, and content structure of this blog."
type: page
author: "Jimmy Nguyen"
---

## About

This website is a demonstration of a fast, simple, and powerful static site generator built with Node.js. It's designed for writers who want to focus on creating content, not on managing a complex system.

### The Philosophy
- **Content is King:** Your words are stored in simple Markdown files that you fully control.
- **Speed is a Feature:** Static HTML files mean your site loads instantly for everyone.
- **Zero Maintenance:** No databases to manage, no plugins to update. Just write.

---

## Understanding Posts vs. Pages

A key feature of any good website is the ability to distinguish between chronological blog posts and timeless, static pages. This system handles that with a simple convention.

### Blog Posts
Blog posts are your time-sensitive articles. They are meant to be shown in a feed, sorted with the newest at the top.

-   They have a `publishedDate` in their frontmatter.
-   They are typically organized into category folders (e.g., `/content/tech/`, `/content/philosophy/`).
-   They automatically appear on the homepage.

### Static Pages
Static pages are for "evergreen" content that doesn't belong in the main feed, like this "About" page, a "Contact" page, or a "Privacy Policy".

-   They **do not** appear in the chronological feed on the homepage.
-   They are typically placed in the main navigation menu for easy access.
-   They are identified by a single line in their frontmatter: `type: page`.

#### How to Create a Page (like this one)

It's incredibly simple. Follow these two steps:

1.  **Create a new `.md` file** directly inside the root `content/` directory. For example, `contact.md` or `services.md`. Do **not** put it in a category subfolder.

2.  **Add `type: page` to the frontmatter.** The build script will automatically recognize this and treat it as a static page, excluding it from the main blog roll and making it available for your navigation menu.

Here is a complete example for a new `contact.md` file:

```yaml
---
title: "Contact Me"
description: "How to get in touch for projects or questions."
type: page
author: "Your Name"
---

## Get In Touch

The best way to reach me is via email at **hello@example.com**.

I look forward to hearing from you!