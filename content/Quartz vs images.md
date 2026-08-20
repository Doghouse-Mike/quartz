---
publish: true
permalink: /Quartz vs images.md
title: Quartz Vs Images
created: 2026-06-25T23:10:57
modified: 2026-07-29T21:29:18
tags:
  - Quartz
  - Obsidian
  - code
  - ai
---

# Quartz Vs Images

> Note, the OG Notepix plugin has integrated this (and added more features!) Since I poked at it a bit. I use that now, and would recommend it instead!

I maybe solved (well, got AI to solve) an issue I had, dunno if anyone else would benefit. Short version is that I have a lot of images. A lot a lot.

Quartz itself handles them fine, but Syncer crashes, something about running the diffs locally and running out of memory. Especially as my preferred workflow would be to run everything from my iPad and dodge the terminal commands.

SO, get the images out of local storage, and have them all be links to the hosted images, simple, no? No. There are plugins that will upload images as you add them (I've already got hundreds in the vault, no dice), and the imgur one will let you upload pre-existing images, but imgur's a cluster f in the UK right now, so again no dice.

[Notepix](https://github.com/AyushParkara/NotePix) though, was probably closest to doing what I wanted

Why not host the images on GitHub, where quartz is gonna be anyway? Just put em all in a separate repo, et voila, Quartz just worries about links, and doesn't need to diff the actual images. But notepix will only upload _new_ images as they're added. Thus with a bit of back and forth with my work-paid-for Gemini account, I present [Notepixs](https://github.com/Doghouse-Mike/NotePixs)

What if Notepix but with a command pallet option to "Upload all local images in current note"?

I accept no credit or blame for anything. Backup your vault before trying anything. So far it's not borked anything in my setup after a couple of runs from macOS, ubunbtu, and iPad though.

Let me know if something breaks/doesn't work. I don't know what I'm doing though, so feature requests are probably a bust.
