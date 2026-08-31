---
publish: true
permalink: /The reasoning behind Kheetsheet.md
created: 2026-07-28T00:13:03
modified: 2026-08-07T08:38:41
tags:
  - ai
  - code
  - Bazzite
  - Linux
  - Ideas
  - programming
---

# The Reasoning Behind [Kheetsheet](https://github.com/Doghouse-Mike/kheetsheet)

I shouldn't be allowed to name things.

[This](https://github.com/Doghouse-Mike/kheetsheet) is very much in homage to Cheatsheet, sadly discontinued, A tribute. Macstories [have a short write up](https://www.macstories.net/mac/cheatsheet-quickly-lists-an-apps-keyboard-shortcuts/), but its praises were sung high and low in the beforetimes.

The TLDR on it is that it sat there silently, hiding on your Mac, waiting until you were struggling to remember a keyboard shortcut, when you could just hold down ⌘ for a couple of seconds, and regardless of which app you're in, a nice little overlay would pop up, telling you all the currently available keyboard shortcuts, what their shortcuts _are_, and letting you click on the one you want to enact it.

In my early days on the Mac, this little gadget was _supremely_ useful in getting around. "Does this app have that shortcut?" or "What's the chord for "paste and match style" again?" or a thousand other examples. It was also great for discoverability. While looking for that shortcut you're pretty sure exists, your eye passes over a bunch of others that you don't need right now, but will do one day.

## To Bazzite

I can't recall exactly what it was I was trying to do with Bazzite the other day, but I knew there'd be (or should be) a keyboard shortcut to do it. But what?

So a few evenings poking around with Claude Code on my Kubuntu laptop (they're both KDE, right, so it should work on both, [right](https://raw.githubusercontent.com/Doghouse-Mike/quartzpics/main/assets/Kheetsheet/Kheetsheet-To-Bazzite-1.jpeg)?), a mostly working version that would sometimes become tiny, an attempt to automatically assign a keyboard shortcut (don't do it, your system will crash), roping my brother in to test on his Bazzite box. then a few more iterations and some tightening of theoretically explotable security issues, and it's done (for now).

![Good Dolphin!](https://raw.githubusercontent.com/Doghouse-Mike/quartzpics/main/assets/Kheetsheet/Kheetsheet-To-Bazzite-2.png)

Install the thing, copy a bit of text, assign a hotkey, et voila, you'll start absorbing shortcuts through osmosis. Why is "normal" paste `CTRL+SHIFT+V` _sometimes_?

![Konsole also plays nice](https://raw.githubusercontent.com/Doghouse-Mike/quartzpics/main/assets/Kheetsheet/Kheetsheet-Caveats-2.png)

## And Hyprland

- I fell in another hole messing around with Omarchy, and although it's pretty keyboard-focused and there are shotcuts out the whazoo (technical term), nothing seemed to offer the same "what can this window I'm in now do?" question. [Et voila](https://github.com/Doghouse-Mike/kheetsheet-hypr/tree/main).

## Caveats

Frustratingly, because there's not "one true" Linux to rule them all, not all software exposes its keyboard shortcuts in the same way, or at all.

Anything Electron especially (et tu, Obsidian?) have their own weirdness about being multiplatform, and some Linux software is more equal than others. It's an entire thing, but there doesn't seem to be quite the same [Mac-assed Mac Apps](https://daringfireball.net/linked/2020/03/20/mac-assed-mac-apps) movement. Even if there was, it'd be KDE-assed vs GNOME-assed vs Cinammon-assed vs Xfce-assed and etc etc.

![Code is not my friend](https://raw.githubusercontent.com/Doghouse-Mike/quartzpics/main/assets/Kheetsheet/Kheetsheet-Caveats-1.png)

So I do what I can, and pillage KDE's accessibility system, _AT-SPI_. I believe the original intent was to enable screen readers and things, once again proving that [accessibility benefits everyone](https://www.curbcuts.co/about#:~:text=Colloquially%2C%20the%20%E2%80%9Ccurb,across%20the%20street.), mayhap. Well behaved software hands AT-SPI a list of all its keyboard shortcuts and menu items. Less well-mannered ones, like Firefox, need a little encouragement, and it'll only hand over the goods for each of it's drop down menus that have already been clicked on by the user, like an animal, and some do nothing at all.

Then there's a whole raft of QTK4 software that have their own system, where `CTRL+?` also takes the Cheatsheet route, but they aren't exposed at a system level. I toyed with the idea of trying to quickly flash that, grab what was shown, and render that as native Kheetsheet would, but between faking keypresses (creepy), performance hits, and weird vanishing window behaviour, nixed that.

### Principles

In an AI app, am I mad? One of the other workarounds I'd considered was maintaining a database of common/popular software, and what shortcuts they use, and either hardcoding that into Kheetsheet (so it can be out of date within hours), or hosting it somewhere so it could be queried on demand (creepy, connectivity issues, _creepy_). I was adamant though that I wouldn't be logging any data, or making any network calls, so some apps don't get to join in on the keyboard shortcut osmosis fest. So it goes.

The idea of weaning myself off the Apple teat does keep buzzing around my brain, but even if I talk myself out of that most rabbity of holes, getting used to the quirks of Linux (or KDE more specifically) will be a bonus, and make whatever I'm doing in there (even if it's just playing games) a smoother experience.

With a bit of luck, after spreading the word a bit, someone who actually knows what they're doing will have a bright idea, or I'll be immediately pointed at someone else's implementation that works better, but for now, I supervised the writing of some software based on an idea I stole from someone else, and if that's not creativity, I don't know what is.

![](https://raw.githubusercontent.com/Doghouse-Mike/quartzpics/main/assets/The-reasoning-behind-Kheetsheet-Principles-1.png)
