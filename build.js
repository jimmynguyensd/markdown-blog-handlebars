import fs from 'fs/promises';
import fse from 'fs-extra'; // for convenient directory operations
import path from 'path';
import MarkdownIt from 'markdown-it';
import Handlebars from 'handlebars';
import { glob } from 'glob';

// Initialize markdown-it
const md = new MarkdownIt();

// --- Configuration ---
const SITE_URL = 'https://www.your-domain.com'; // IMPORTANT: Change this to your actual domain!
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const OUTPUT_DIR = './public';

// --- Helper Functions ---

// NEW: Helper to create URL-friendly slugs from strings
const slugify = (str) => {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
};

const parseFrontmatter = (content) => {
    // ... (This function is unchanged)
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = frontmatterRegex.exec(content);
    if (!match) throw new Error("Invalid or missing frontmatter in a markdown file.");
    const frontmatter = match[1];
    const body = content.substring(match[0].length).trim();
    const metadata = {};
    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            metadata[key.trim()] = valueParts.join(':').trim();
        }
    });
    return { metadata, body };
};

const processMarkdownFile = (markdownContent, filePath) => {
    // ... (This function is unchanged)
    const { metadata, body } = parseFrontmatter(markdownContent);
    const htmlContent = md.render(body);
    const relativePath = path.relative(CONTENT_DIR, filePath);
    const parentDir = path.dirname(relativePath);
    let category = '';
    if (parentDir !== '.') category = parentDir;
    const slug = path.basename(relativePath, '.md');
    return { slug, category, path: filePath, metadata, content: htmlContent };
};

const generateSitemap = (posts, pages) => {
    // ... (This function is unchanged)
    const allContent = [...posts, ...pages];
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    sitemapXml += `<url><loc>${SITE_URL}/</loc></url>`;
    for (const item of allContent) {
        const itemPath = item.category ? `${item.category}/${item.slug}` : item.slug;
        const fullUrl = `${SITE_URL}/${itemPath}/`;
        sitemapXml += `<url><loc>${fullUrl}</loc></url>`;
    }
    sitemapXml += `</urlset>`;
    return sitemapXml;
};


// --- Main Build Function ---
const buildSite = async () => {
    console.log("Starting static site build...");

    // 1. Clean output directory
    await fse.emptyDir(OUTPUT_DIR);
    console.log(`Cleaned ${OUTPUT_DIR}`);

    // 2. Load templates
    const postTemplateSource = await fs.readFile(path.join(TEMPLATES_DIR, 'post.hbs'), 'utf8');
    const postTemplate = Handlebars.compile(postTemplateSource);
    const indexTemplateSource = await fs.readFile(path.join(TEMPLATES_DIR, 'index.hbs'), 'utf8');
    const indexTemplate = Handlebars.compile(indexTemplateSource);
    // NEW: Load author templates
    const authorsTemplateSource = await fs.readFile(path.join(TEMPLATES_DIR, 'authors.hbs'), 'utf8');
    const authorsTemplate = Handlebars.compile(authorsTemplateSource);
    const authorTemplateSource = await fs.readFile(path.join(TEMPLATES_DIR, 'author.hbs'), 'utf8');
    const authorTemplate = Handlebars.compile(authorTemplateSource);


    // 3. Process all markdown files
    const markdownPaths = await glob('content/**/*.md');
    const allPosts = [];
    const allPages = [];
    for (const filePath of markdownPaths) {
        // ... (This loop is unchanged)
        console.log(`Processing: ${filePath}`);
        const markdownContent = await fs.readFile(filePath, 'utf8');
        const fileData = processMarkdownFile(markdownContent, filePath);
        if (fileData.metadata.type === 'page') {
            allPages.push(fileData);
        } else {
            allPosts.push(fileData);
        }
        const outputPostDir = fileData.category
            ? path.join(OUTPUT_DIR, fileData.category, fileData.slug)
            : path.join(OUTPUT_DIR, fileData.slug);
        await fse.ensureDir(outputPostDir);
        const outputPath = path.join(outputPostDir, 'index.html');
        // Create the author's slug if an author exists for this post
        const authorSlug = fileData.metadata.author ? slugify(fileData.metadata.author) : null;

        // Pass the 'pages' array AND the new 'authorSlug' to the template
        const templateData = {
            ...fileData,
            pages: allPages,
            authorSlug: authorSlug 
        };

        const renderedHtml = postTemplate(templateData);
        await fs.writeFile(outputPath, renderedHtml);
        console.log(`Generated: ${outputPath}`);
    }

    // 4. Sort posts for the index page feed
    const sortedPosts = allPosts.sort((a, b) => 
        new Date(b.metadata.publishedDate).getTime() - new Date(a.metadata.publishedDate).getTime()
    );

    // 5. Generate homepage/index.html
    const indexHtml = indexTemplate({ posts: sortedPosts, pages: allPages });
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log(`Generated: ${path.join(OUTPUT_DIR, 'index.html')}`);

    // --- NEW SECTION: GENERATE AUTHOR PAGES ---
    console.log('Generating author pages...');
    // 6. Group posts by author
    const postsByAuthor = allPosts.reduce((acc, post) => {
        const author = post.metadata.author;
        if (author) {
            if (!acc[author]) acc[author] = [];
            acc[author].push(post);
        }
        return acc;
    }, {});

    // 7. Generate the main authors listing page (authors/index.html)
    const authorsList = Object.keys(postsByAuthor).map(author => ({
        name: author,
        slug: slugify(author),
        postCount: postsByAuthor[author].length
    }));

    const authorsPageDir = path.join(OUTPUT_DIR, 'authors');
    await fse.ensureDir(authorsPageDir);
    const authorsIndexHtml = authorsTemplate({ authors: authorsList, pages: allPages });
    await fs.writeFile(path.join(authorsPageDir, 'index.html'), authorsIndexHtml);
    console.log(`Generated: ${path.join(authorsPageDir, 'index.html')}`);

    // 8. Generate a page for each individual author
    for (const authorName of Object.keys(postsByAuthor)) {
        const authorSlug = slugify(authorName);
        const authorPosts = postsByAuthor[authorName].sort((a, b) => 
            new Date(b.metadata.publishedDate).getTime() - new Date(a.metadata.publishedDate).getTime()
        );

        const authorPageDir = path.join(OUTPUT_DIR, 'authors', authorSlug);
        await fse.ensureDir(authorPageDir);

        const authorPageHtml = authorTemplate({
            authorName: authorName,
            posts: authorPosts,
            pages: allPages
        });
        const outputPath = path.join(authorPageDir, 'index.html');
        await fs.writeFile(outputPath, authorPageHtml);
        console.log(`Generated: ${outputPath}`);
    }
    // --- END OF NEW SECTION ---

    // 9. Copy static assets
    const assetsSourceDir = path.join(CONTENT_DIR, 'assets');
    const assetsDestDir = path.join(OUTPUT_DIR, 'assets');
    if (await fse.pathExists(assetsSourceDir)) {
        await fse.copy(assetsSourceDir, assetsDestDir);
        console.log(`Copied assets to ${assetsDestDir}`);
    }

    // 10. Generate sitemap.xml
    const sitemapContent = generateSitemap(allPosts, allPages);
    await fs.writeFile(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapContent);
    console.log(`Generated: ${path.join(OUTPUT_DIR, 'sitemap.xml')}`);

    console.log("Static site build complete!");
};

buildSite().catch(console.error);