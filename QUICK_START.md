# 🚀 Quick Start - Launch Saffron with Landing Page

## Launch the App (3 Steps)

### Step 1: Navigate to Saffron folder
```bash
cd /Users/shanliu/ideas/trading-interface/CascadeProjects/windsurf-project/Saffron
```

### Step 2: Start the Expo server
```bash
npm start
```
Or:
```bash
npx expo start
```

### Step 3: Open on device
Once started, press:
- **`i`** - iOS Simulator
- **`a`** - Android Emulator  
- **`w`** - Web Browser
- **Scan QR** - With Expo Go app on phone

---

## What You'll See

### 1️⃣ Landing Page (New Default!)
**First screen:** Beautiful landing page with:
- Hero section with "Launch App" button
- Problem/solution sections
- Strategy cards
- Pricing
- Waitlist signup form
- Security explanation

**Actions:**
- Click **"Launch App"** → Opens the Saffron AI Assistant
- Enter email → Join waitlist
- Scroll to explore all sections

---

### 2️⃣ AI Assistant Tab
**Natural language trading interface:**
```
Type: "Buy $100 SOL daily"
→ Creates DCA strategy

Type: "Grid trade SOL between $40-$60"
→ Creates grid strategy
```

---

### 3️⃣ Portfolio Tab
**Trading dashboard:**
- Account balance
- Active positions
- Holdings with live prices
- Quick actions
- Performance metrics

---

## Quick Commands

```bash
# Start development
npm start

# Start with cache clear
npm start -c

# iOS only
npm run ios

# Android only
npm run android

# Web only
npm run web
```

---

## File Structure

```
Saffron/
├── app/
│   ├── landing.tsx          ← NEW: Landing page (default)
│   ├── _layout.tsx          ← Updated: Landing first
│   ├── (tabs)/
│   │   ├── index.tsx        ← AI Assistant
│   │   └── explore.tsx      ← Portfolio
│   └── modal.tsx
├── components/
├── services/
└── package.json
```

---

## User Flow

```
App Opens
    ↓
Landing Page (new!)
    ↓
[Click "Launch App"]
    ↓
Tabs Navigation
    ├── AI Assistant (chat)
    └── Portfolio (dashboard)
```

---

## Testing Checklist

### Landing Page:
- [ ] Hero section loads
- [ ] "Launch App" button works
- [ ] Scroll through all sections
- [ ] Waitlist form accepts email
- [ ] Dark mode toggle works
- [ ] Responsive on different sizes

### AI Assistant:
- [ ] Type a command
- [ ] Strategy preview appears
- [ ] Confirm execution
- [ ] Transaction updates

### Portfolio:
- [ ] Balance displays
- [ ] Holdings show prices
- [ ] Quick actions work
- [ ] Charts render

---

## Troubleshooting

### Port already in use?
```bash
# Kill existing process
lsof -ti:8081 | xargs kill -9

# Start again
npm start
```

### Cache issues?
```bash
npm start -- --clear
```

### Dependencies missing?
```bash
npm install
```

### Simulator not opening?
```bash
# iOS
xcrun simctl boot iPhone 15
npm run ios

# Android
emulator -avd Pixel_7_API_34
npm run android
```

---

## Next Steps

1. **Test Landing Page**
   - Click through all sections
   - Try "Launch App" button
   - Test waitlist form

2. **Customize Content**
   - Update founder story
   - Change status items
   - Adjust pricing if needed

3. **Connect Backend**
   - Waitlist API
   - Analytics tracking
   - User authentication

4. **Share with Testers**
   - Send app link
   - Collect feedback
   - Iterate quickly

---

## Hot Reload

Any changes you make will automatically reload:
- Edit `landing.tsx` → Landing page updates
- Edit `index.tsx` → AI Assistant updates
- Edit `explore.tsx` → Portfolio updates

---

## Key Files to Customize

### `app/landing.tsx`
**Landing page content:**
- Founder story (line ~354)
- Status items (lines ~369-373)
- Waitlist handler (lines ~29-40)
- Pricing (lines ~485-505)
- Colors (lines ~33-39)

### `app/(tabs)/index.tsx`
**AI Assistant logic:**
- Command parsing
- Strategy creation
- Transaction handling

### `app/(tabs)/explore.tsx`
**Portfolio display:**
- Holdings data
- Price updates
- Performance charts

---

## Launch Checklist

Before sharing with users:

### Content:
- [ ] Update founder story
- [ ] Current status accurate
- [ ] Pricing confirmed
- [ ] CTAs working

### Technical:
- [ ] Waitlist form connected
- [ ] Analytics tracking added
- [ ] Error handling robust
- [ ] Loading states polished

### Testing:
- [ ] iOS tested
- [ ] Android tested
- [ ] Web tested
- [ ] Dark mode works

---

## Support

**App won't start?**
1. Check Node.js version (18+)
2. Run `npm install`
3. Clear cache: `npm start -c`
4. Restart terminal

**Landing page not showing?**
1. Check `app/_layout.tsx` line 18
2. Should say `name="landing"`
3. Restart dev server

**"Launch App" not working?**
1. Check console for errors
2. Verify `router.push('/(tabs)')` works
3. Check tab navigation setup

---

## 🎉 You're Ready!

**Landing page is live and integrated!**

Launch the app and test the flow:
```bash
cd Saffron
npm start
```

Then press `i`, `a`, or `w` to open!

---

**Questions? Check:**
- `LANDING_PAGE.md` - Full documentation
- `business/LANDING_PAGE_SUMMARY.md` - Overview
- Code comments in `landing.tsx`

**Good luck with launch!** 🚀🌸
