import 'dotenv/config';
import fs from 'fs/promises';
import fse from 'fs-extra';
import path from 'path';
import MarkdownIt from 'markdown-it';
import Handlebars from 'handlebars';
import { glob } from 'glob';
import yaml from 'js-yaml';

// Initialize markdown-it
const md = new MarkdownIt();

// --- Configuration ---
// Read from environment variables, with sensible defaults
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
const CONTENT_DIR = process.env.CONTENT_DIR || './content';
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || './templates';
const OUTPUT_DIR = process.env.OUTPUT_DIR || './public';

// --- Helper Functions ---

//create URL-friendly slugs from strings
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
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = frontmatterRegex.exec(content);

    if (!match) {
        throw new Error("Invalid or missing frontmatter in a markdown file.");
    }

    const frontmatter = match[1];
    const body = content.substring(match[0].length).trim();
    
    //parse the frontmatter
    const metadata = yaml.load(frontmatter);

    return { metadata, body };
};

const processMarkdownFile = (markdownContent, filePath) => {
    const { metadata, body } = parseFrontmatter(markdownContent);
    const htmlContent = md.render(body);
    const relativePath = path.relative(CONTENT_DIR, filePath);
    const parentDir = path.dirname(relativePath);
    let category = '';
    if (parentDir !== '.') category = parentDir;
    const slug = path.basename(relativePath, '.md');
    return { slug, category, path: filePath, metadata, content: htmlContent };
};

const generateSitemap = (posts, pages, authors) => {
    const allContent = [...posts, ...pages];
    let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add static/known pages first
    sitemapXml += `\n  <url><loc>${SITE_URL}/</loc></url>`;
    if (authors.length > 0) {
        sitemapXml += `\n  <url><loc>${SITE_URL}/authors/</loc></url>`;
    }

    // Add posts and pages
    for (const item of allContent) {
        const itemPath = item.category ? `${item.category}/${item.slug}` : item.slug;
        const fullUrl = `${SITE_URL}/${itemPath}/`;
        sitemapXml += `\n  <url><loc>${fullUrl}</loc></url>`;
    }
    
    // Add individual author pages
    for (const author of authors) {
        const fullUrl = `${SITE_URL}/authors/${author.slug}/`;
        sitemapXml += `\n  <url><loc>${fullUrl}</loc></url>`;
    }

    sitemapXml += `\n</urlset>`;
    return sitemapXml;
};


// --- Main Build Function ---
const buildSite = async () => {
    console.log("Starting static site build...");

    await fse.emptyDir(OUTPUT_DIR);
    console.log(`Cleaned ${OUTPUT_DIR}`);

    const postTemplate = Handlebars.compile(await fs.readFile(path.join(TEMPLATES_DIR, 'post.hbs'), 'utf8'));
    const indexTemplate = Handlebars.compile(await fs.readFile(path.join(TEMPLATES_DIR, 'index.hbs'), 'utf8'));
    const authorsTemplate = Handlebars.compile(await fs.readFile(path.join(TEMPLATES_DIR, 'authors.hbs'), 'utf8'));
    const authorTemplate = Handlebars.compile(await fs.readFile(path.join(TEMPLATES_DIR, 'author.hbs'), 'utf8'));

    const authorPaths = await glob('content/authors/*.md');
    const authorsDataMap = new Map();

    for (const authorPath of authorPaths) {
        const authorSlug = path.basename(authorPath, '.md');
        const markdownContent = await fs.readFile(authorPath, 'utf8');
        const { metadata, body } = parseFrontmatter(markdownContent);
        
        authorsDataMap.set(authorSlug, {
            profile: metadata,
            content: md.render(body),
            slug: authorSlug,
            posts: []
        });
    }
    console.log(`Processed ${authorsDataMap.size} author profiles.`);

    const markdownPaths = await glob('content/**/*.md');
    const allPosts = [];
    const allPages = [];

    for (const filePath of markdownPaths) {
        if (filePath.startsWith('content/authors/')) continue;

        console.log(`Processing: ${filePath}`);
        const markdownContent = await fs.readFile(filePath, 'utf8');
        const fileData = processMarkdownFile(markdownContent, filePath);
        
        const authorSlug = fileData.metadata.author ? slugify(fileData.metadata.author) : null;
        
        if (fileData.metadata.type === 'page') {
            allPages.push(fileData);
        } else {
            allPosts.push(fileData);
            if (authorSlug && authorsDataMap.has(authorSlug)) {
                authorsDataMap.get(authorSlug).posts.push(fileData);
            }
        }

        const outputPostDir = fileData.category ? path.join(OUTPUT_DIR, fileData.category, fileData.slug) : path.join(OUTPUT_DIR, fileData.slug);
        await fse.ensureDir(outputPostDir);
        const outputPath = path.join(outputPostDir, 'index.html');
        
        const renderedHtml = postTemplate({ ...fileData, pages: allPages, authorSlug });
        await fs.writeFile(outputPath, renderedHtml);
        console.log(`Generated: ${outputPath}`);
    }

    const sortedPosts = allPosts.sort((a, b) => new Date(b.metadata.publishedDate) - new Date(a.metadata.publishedDate));
    const indexHtml = indexTemplate({ posts: sortedPosts, pages: allPages });
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log(`Generated: ${path.join(OUTPUT_DIR, 'index.html')}`);

    console.log('Generating author pages...');
    const authorsListForIndex = Array.from(authorsDataMap.values()).map(author => ({
        name: author.profile.name,
        slug: author.slug,
        postCount: author.posts.length,
        bio_short: author.profile.bio_short
    }));
    
    const authorsPageDir = path.join(OUTPUT_DIR, 'authors');
    await fse.ensureDir(authorsPageDir);
    const authorsIndexHtml = authorsTemplate({ authors: authorsListForIndex, pages: allPages });
    await fs.writeFile(path.join(authorsPageDir, 'index.html'), authorsIndexHtml);
    console.log(`Generated: ${path.join(authorsPageDir, 'index.html')}`);

    for (const authorData of authorsDataMap.values()) {
        const authorPageDir = path.join(OUTPUT_DIR, 'authors', authorData.slug);
        await fse.ensureDir(authorPageDir);
        
        authorData.posts.sort((a, b) => new Date(b.metadata.publishedDate) - new Date(a.metadata.publishedDate));

        const authorPageHtml = authorTemplate({ ...authorData, pages: allPages });
        await fs.writeFile(path.join(authorPageDir, 'index.html'), authorPageHtml);
        console.log(`Generated: ${path.join(authorPageDir, 'index.html')}`);
    }

    const assetsSourceDir = path.join(CONTENT_DIR, 'assets');
    const assetsDestDir = path.join(OUTPUT_DIR, 'assets');
    if (await fse.pathExists(assetsSourceDir)) {
        await fse.copy(assetsSourceDir, assetsDestDir);
        console.log(`Copied assets to ${assetsDestDir}`);
    }

    const authorsForSitemap = Array.from(authorsDataMap.values());
    const sitemapContent = generateSitemap(allPosts, allPages, authorsForSitemap);
    await fs.writeFile(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemapContent);
    console.log(`Generated: ${path.join(OUTPUT_DIR, 'sitemap.xml')}`);

    console.log("Static site build complete!");
};

buildSite().catch(console.error);