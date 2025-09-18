import fs from 'fs/promises';
import fse from 'fs-extra'; // for convenient directory operations
import path from 'path';
import MarkdownIt from 'markdown-it';
import Handlebars from 'handlebars';
import { glob } from 'glob';

// Initialize markdown-it
const md = new MarkdownIt();

// --- Configuration ---
const CONTENT_DIR = './content';
const TEMPLATES_DIR = './templates';
const OUTPUT_DIR = './public'; // Where static HTML will be saved
const MANIFEST_PATH = path.join(CONTENT_DIR, 'manifest.json');

// --- Helper Functions (adapted from your .ts code) ---
const parseFrontmatter = (content) => {
    const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
    const match = frontmatterRegex.exec(content);

    if (!match) {
        throw new Error("Invalid or missing frontmatter in a markdown file.");
    }

    const frontmatter = match[1];
    const body = content.substring(match[0].length).trim();
    const metadata = {};

    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            metadata[key.trim()] = value;
        }
    });

    return { metadata, body };
};

const processMarkdownFile = (markdownContent, filePath) => {
    const { metadata, body } = parseFrontmatter(markdownContent);
    
    // Convert markdown body to HTML
    const htmlContent = md.render(body);

    // Use path.relative to correctly get the path from CONTENT_DIR
    const relativePath = path.relative(CONTENT_DIR, filePath);

    const relativePathWithoutExt = relativePath.replace(/\.md$/, ''); 
    const pathParts = relativePathWithoutExt.split(path.sep);

    let category = '';
    // Use path.dirname to handle nested directories gracefully
    const parentDir = path.dirname(relativePath);

    // If the parent directory is not the root ('.'), it's our category.
    if (parentDir !== '.') {
      category = parentDir;
    }

    // Use path.basename to get the final part of the path as the slug
    const slug = path.basename(relativePath, '.md'); // 'state-of-react-2025'
    
    return {
        slug,
        category, // This will now correctly be 'tech'
        path: filePath, // Original file path
        metadata,
        content: htmlContent, // HTML content now!
    };
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

    // 3. Find all markdown files automatically
    const markdownPaths = await glob('content/**/*.md'); // CHANGED: Renamed variable for clarity

    // CHANGED: Create two separate arrays for posts and pages
    const allPosts = [];
    const allPages = [];

    for (const filePath of markdownPaths) { // CHANGED: Renamed variable
        console.log(`Processing: ${filePath}`);
        const markdownContent = await fs.readFile(filePath, 'utf8');
        const fileData = processMarkdownFile(markdownContent, filePath);

        // CHANGED: Logic to separate pages from posts based on frontmatter
        if (fileData.metadata.type === 'page') {
            allPages.push(fileData);
        } else {
            allPosts.push(fileData);
        }

        // The file generation logic is the same for both pages and posts
        const outputPostDir = fileData.category
            ? path.join(OUTPUT_DIR, fileData.category, fileData.slug)
            : path.join(OUTPUT_DIR, fileData.slug);

        await fse.ensureDir(outputPostDir);

        const outputFileName = 'index.html';
        const outputPath = path.join(outputPostDir, outputFileName);
        
        // CHANGED: Pass the 'pages' array to every template for navigation
        const renderedHtml = postTemplate({ ...fileData, pages: allPages });
        await fs.writeFile(outputPath, renderedHtml);
        console.log(`Generated: ${outputPath}`);
    }

    // 4. Sort ONLY the posts for the index page feed
    const sortedPosts = allPosts.sort((a, b) => 
        new Date(b.metadata.publishedDate).getTime() - new Date(a.metadata.publishedDate).getTime()
    );

    // 5. Generate homepage/index.html
    // CHANGED: Pass both 'posts' and 'pages' to the index template
    const indexHtml = indexTemplate({ posts: sortedPosts, pages: allPages });
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log(`Generated: ${path.join(OUTPUT_DIR, 'index.html')}`);

    // 6. Copy static assets (was step 5)
    const assetsSourceDir = path.join(CONTENT_DIR, 'assets');
    const assetsDestDir = path.join(OUTPUT_DIR, 'assets');
    if (await fse.pathExists(assetsSourceDir)) {
        await fse.copy(assetsSourceDir, assetsDestDir);
        console.log(`Copied assets to ${assetsDestDir}`);
    }

    console.log("Static site build complete!");
};

buildSite().catch(console.error);