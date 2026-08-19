import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Md, mdToHtml } from './md'

const IMG = '/vfar/0123456789abcdef0123456789abcdef.jpg'
const MP4 = '/flock/asset/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mp4'
const react = (text: string) => renderToStaticMarkup(<Md text={text} />)

describe('Md — images', () => {
  it('turns an artifact alone on a line into the picture', () => {
    const out = react(`Here's the heron.\n\n${IMG}\n\nMade with flux.`)
    expect(out).toContain(`<img src="https://elle-worker.sbarteau2022.workers.dev${IMG}"`)
    expect(out).toContain("Here&#x27;s the heron.")
    expect(out).toContain('Made with flux.')
  })

  // The regression this guards: without images opening a block, a picture
  // written directly under a sentence is swallowed into that paragraph and
  // shown as a bare path.
  it('renders a picture written under a sentence with no blank line', () => {
    const out = react(`Here's the heron.\n${IMG}`)
    expect(out).toContain('<img')
    expect(out).not.toContain(`>${IMG}<`)
  })

  it('uses markdown image alt as the caption', () => {
    const out = react(`![a heron over slack water](${IMG})`)
    expect(out).toContain('alt="a heron over slack water"')
    expect(out).toContain('a heron over slack water</span>')
  })

  it('gives an mp4 a player rather than an img', () => {
    const out = react(MP4)
    expect(out).toContain('<video')
    expect(out).not.toContain('<img')
  })
})

describe('Md — the security boundary', () => {
  // Her answer carries web-search results and other people's text, so an
  // <img src> taken from it is an outbound request someone else could aim.
  it('never loads an external image — it degrades to a link', () => {
    const out = react('![tracker](https://evil.example/px.gif)')
    expect(out).not.toContain('<img')
    expect(out).toContain('href="https://evil.example/px.gif"')
    expect(out).toContain('tracker')
  })

  it('never loads an image for a path the worker would 404', () => {
    for (const bad of ['/vfar/short.jpg', `![x](/vfar/short.jpg)`, '/etc/passwd']) {
      expect(react(bad), bad).not.toContain('<img')
    }
  })

  it('emits no raw HTML from her text — the file\'s standing promise', () => {
    const out = react('<script>alert(1)</script> and <b>bold</b>')
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
  })
})

describe('Md — existing grammar still intact', () => {
  it('renders bold, italic, code and links', () => {
    const out = react('**bold** and *em* and `code` and [link](https://x.com)')
    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>em</em>')
    expect(out).toContain('code</code>')
    expect(out).toContain('href="https://x.com"')
  })

  it('renders a GFM table', () => {
    const out = react('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(out).toContain('<table')
    expect(out).toContain('<th')
    expect(out).toContain('<td')
  })

  it('pretty-prints a bare JSON answer instead of running prose rules on it', () => {
    expect(react('{"a_b":1}')).toContain('<pre')
  })
})

describe('mdToHtml — the print/PDF window', () => {
  it('keeps pictures in a saved answer', () => {
    expect(mdToHtml(IMG)).toContain(`<img src="https://elle-worker.sbarteau2022.workers.dev${IMG}"`)
  })

  it('links an mp4 rather than emitting a broken img on paper', () => {
    const out = mdToHtml(MP4)
    expect(out).toContain('<a href=')
    expect(out).not.toContain('<img')
  })

  it('holds the same boundary as the screen renderer', () => {
    expect(mdToHtml('![tracker](https://evil.example/px.gif)')).not.toContain('<img')
  })

  it('escapes her text before any formatting runs', () => {
    expect(mdToHtml('<script>alert(1)</script>')).not.toContain('<script>')
  })
})
