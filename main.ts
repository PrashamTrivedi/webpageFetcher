#!/usr/bin/env -S deno run
import {parseArgs} from "jsr:@std/cli/parse-args"
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts"
import {NodeHtmlMarkdown} from 'npm:node-html-markdown'



// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const flags = parseArgs(Deno.args)
  const url = flags.url as string
  const reportPage = flags.reportPage as string
  const desiredTitle = flags.title as string
  const selector = flags.selector as string
  if (!url) {
    console.error("url is required")
    Deno.exit(1)
  }
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.goto(url, {
    waitUntil: "networkidle2",
  })

  let content: string
  if (selector) {
    content = await page.$eval(selector, el => el.innerHTML)
  } else {
    content = await page.content()
  }

  const title = await page.title()
  const titleToSave = desiredTitle ?? title.split(' ').join('_').split(':').join('_').split('/').join('_').split('.').join('_')
  let reportLocation = reportPage ? reportPage : '~/.webpageFetcher'
  if (reportLocation.endsWith('/')) {
    reportLocation = reportLocation.slice(0, -1)
  }
  console.log(`saving ${titleToSave}.md to markdown ${reportLocation}/${titleToSave}.md`)

  const markdown = NodeHtmlMarkdown.translate(content)
  await Deno.writeTextFile(`${reportLocation}/${titleToSave}.md`, markdown)
  await browser.close()
  console.log(`done`)
}
