# Simple Markdown & Handlebars Blog Engine

A fast, simple, zero-maintenance static site generator for writers and creators who want to own their content. This project uses plain Markdown files for content, Handlebars for templating, and a simple Node.js script to generate a lightning-fast static website.

## Philosophy

-   **Content First:** Write your articles as simple `.md` files in any text editor you love.
-   **Own Your Data:** No databases. Your entire site is a folder of text files. Easy to backup, move, and version control with Git.
-   **Blazing Speed:** Generates pure, static HTML. Deploy it to any static host for instant page loads.
-   **Zero Maintenance:** No security updates, no plugin conflicts, no database migrations. Just write and build.

## Features

-   **Automatic Content Discovery:** Just drop `.md` files into the `/content` directory. No manual manifest files needed.
-   **Posts vs. Pages Distinction:** Easily create timeless pages (like "About" or "Contact") that are kept separate from your chronological blog feed.
-   **Directory-based Categories:** The folder structure in `/content` automatically becomes the category structure for your blog posts.
-   **Pretty URLs:** Generates clean URLs like `/category/post-slug/` instead of `/post.html`.
-   **Markdown-it Powered:** Supports all standard Markdown syntax, including tables and code blocks.
-   **Handlebars Templating:** Simple and powerful templating for your post layouts and homepage.
-   **Local Development Server:** Easily preview your site locally before deploying.
-   **Author pages:** Generates author pages for each author
-   **Sitemap:** Generates a sitemap of all files during build.

## Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or newer recommended)
-   npm (comes with Node.js)

## Installation

1.  Clone this repository:
    ```bash
    git clone <your-repository-url>
    ```
2.  Navigate into the project directory:
    ```bash
    cd markdown-blog-handlebars
    ```
3.  Install the required dependencies:
    ```bash
    npm install
    ```

## How to Use

### Before we start...

Find the .env_EXAMPLE and rename it to .env.

Change the website value. 

### 1. Create Content: Posts, Pages, and Author pages

This system supports two types of content: chronological **posts** for your blog feed and timeless **pages** for navigation.

#### Blog Posts (The Default)
These are your articles. They are automatically sorted by date and displayed on the homepage.
-   Place them in subdirectories inside `content/` (e.g., `content/tech/`). The subdirectory becomes the post's category.
-   They **must** have a `publishedDate` in the frontmatter.

### Example Post Frontmatter

```yaml
---
title: "My Awesome New Post"
description: "A short description of the post for SEO and previews."
publishedDate: 2024-05-21
author: "Your Name"
---
```

Your article content starts here...

---

### Static Pages (For Navigation)

These are for content like "About" or "Contact." They do **not** appear in the blog feed but can be added to your site's navigation menu.

- Place them directly in the root of the `content/` directory (e.g., `content/about.md`).
- They **must** have `type: page` in the frontmatter to be excluded from the blog feed.

**Example Page Frontmatter:**

```yaml
---
title: "About This Site"
description: "Learn more about the philosophy behind this blog."
type: page
author: "Your Name"
---
```

This is the content for your about page...

---

### Author Pages

Beyond just listing posts, you can create rich, content-driven profile pages for each author. This allows for custom bios, social links, and improved SEO (E-E-A-T).

The system links the `author:` field in your blog posts to a dedicated Markdown file for that author.

#### Step 1: Create the Author's Profile File

- Inside your `content` folder, create a new directory named `authors`.
- In `content/authors/`, create a Markdown file for each author. The filename must be a URL-friendly slug for the author (e.g., for "Jimmy Nguyen", use `jimmy-nguyen.md`).

#### Step 2: Add Author Profile Content

Each author file uses frontmatter for profile data and the main body for the author's detailed bio.

**Example: `content/authors/jimmy-nguyen.md`**

```yaml
---
name: "Jimmy Nguyen"         # (Required) Full display name
title: "Nerd"               # (Optional) Job title or role
bio_short: "Web dev & coffee drinker" # (Optional) One-line bio for listings
social:                      # (Optional) Social media links
    github: "gihub url here"
    twitter: "twitter url here"
    website: "website url here"
---
Jimmy likes coffee.
```

#### Step 3: Link Posts to the Author

In your blog post `.md` files, use the author's full name in the `author` field. The build script will automatically connect the post to the author's profile.

**Example Blog Post: `content/tech/my-post.md`**

```yaml
---
title: "My Awesome New Post"
description: "A short description of the post."
publishedDate: 2024-05-21
author: "Jimmy Nguyen"
---
```

This post will now be automatically associated with the profile defined in `content/authors/jimmy-nguyen.md`. A link to the author's profile will appear on the post's page.


### 2. Add Images & Assets

Place all your images, PDFs, or other static files into the `content/assets/` folder.  
Link to them in your Markdown using relative paths, like `../../assets/my-image.png`.

---

### 3. Build the Site

Run the build command to generate your static HTML files in the `/public` directory:

```bash
npm run build
```

---

### 4. Preview Locally

To see your site before deploying, start the local development server:

```bash
npm run start
```

Visit [http://localhost:3000](http://localhost:3000) (or the URL shown in your terminal) to view your site.

---

```
.
├── content/            # Your raw content lives here.
│   ├── assets/         # Place all images and static files here.
│   ├── about.md        # A top-level file becomes a static page.
│   └── tech/           # Subdirectories are categories for posts.
│       └── my-post.md
├── public/             # The generated static site (don't edit this directly).
├── templates/          # Handlebars layout files (post.hbs, index.hbs).
├── build.js            # The Node.js script that builds the site.
├── package.json        # Project configuration and dependencies.
└── README.md           # This file.
```
