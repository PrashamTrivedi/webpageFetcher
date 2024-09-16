#!/usr/bin/env -S deno run
import {parseArgs} from "jsr:@std/cli/parse-args"
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts"
import {NodeHtmlMarkdown} from 'npm:node-html-markdown'
import {DOMParser} from "jsr:@b-fuze/deno-dom"
import {Browser} from "https://deno.land/x/puppeteer@16.2.0/mod.ts"

const visited: string[] = []
let depth = 0
// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const flags = parseArgs(Deno.args)
  const url = flags.url as string
  const reportPage = flags.reportPage as string
  const desiredTitle = flags.title as string
  const selector = flags.selector as string
  const followLinks = flags.followLinks as boolean
  const maxDepth = flags.maxDepth as number
  if (flags.help) {
    console.log(`Usage: deno run main.ts [options]
    
      Options:
        --url <url>                The URL to fetch
        --reportPage <path>        The path to save the report
        --title <title>            The title for the report
        --selector <selector>      The CSS selector to extract content
        --followLinks              Follow links in the page
        --maxDepth <number>        Maximum depth to follow links
        --help                     Show this help message
    `)
    Deno.exit(0)
  }

  if (!url) {
    console.error("url is required")
    Deno.exit(1)
  }
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })


  await goToPage(url, browser, reportPage, selector, desiredTitle, followLinks, maxDepth)




  await browser.close()
  console.log(`done`)
}

async function goToPage(url: string, browser: Browser, reportPage: string, pageSelector?: string,
  reportTitle?: string, followLinks?: boolean, maxDepth?: number) {
  console.log(`going to ${url}`)
  const page = await browser.newPage()
  await page.goto(url, {
    waitUntil: "networkidle2",
  })

  let content: string
  if (pageSelector) {
    content = await page.$eval(pageSelector, el => el.innerHTML)
  } else {
    content = await page.content()
  }

  const title = await page.title()
  const properTitle = title.split(' ').join('_').split(':').join('_').split('/').join('_').split('.').join('_')
  const finalTitle = reportTitle ?? properTitle
  const titleToSave = (followLinks) ? `${finalTitle}_${properTitle}` : finalTitle
  let reportLocation = reportPage ? reportPage : '~/.webpageFetcher'
  if (reportLocation.endsWith('/')) {
    reportLocation = reportLocation.slice(0, -1)
  }
  console.log(`saving ${titleToSave}.md to markdown ${reportLocation}/${titleToSave}.md`)

  const markdown = NodeHtmlMarkdown.translate(content)
  await Deno.writeTextFile(`${reportLocation}/${titleToSave}.md`, markdown)
  if (followLinks) {
    const domain = new URL(url).hostname

    const links = parseLinks(content, domain)
    for (const link of links) {
      let linkToVisit = link
      if (link.startsWith("/")) {
        linkToVisit = `https://${domain}/${link.substring(1)}`
      }
      if (depth < (maxDepth ?? 0)) {
        if (visited.indexOf(linkToVisit) === -1) {
          visited.push(linkToVisit)
          await goToPage(linkToVisit, browser, reportPage, pageSelector, finalTitle, followLinks, maxDepth ?? 0)
          depth++
        }
      }

    }

  }
}

function parseLinks(html: string, domain: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const links = Array.from(doc.querySelectorAll('a'))
  return links.map(link => link.getAttribute('href')).filter(href => href !== null && (href.startsWith("/") || href.indexOf(domain) !== -1)) as string[]
}