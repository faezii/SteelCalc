# SteelCalc

An open-source steel weight and quotation calculator for engineers, contractors, fabricators, and procurement professionals.

No build step, no backend, no dependencies to install — it's a static site that runs anywhere (open `index.html`, drop it on GitHub Pages, or host it on any web server).

## Features

- **MS Pipe Weight Calculator** — round hollow section from OD × thickness
- **RHS / SHS Weight Calculator** — rectangular and square hollow sections
- **H-Beam Calculator** — by dimensions (plate-area method)
- **I-Beam Calculator** — by dimensions (plate-area method)
- **MS Plate Calculator** — per sheet from length × width × thickness
- **Round Bar Calculator** — from diameter
- **Cost Estimator** — unit rate per kg → line cost, multi-currency (QAR, SAR, AED, OMR, BHD, KWD, USD, INR)
- **Unit Converter** — length, weight, and area
- **Quotation builder** — collect line items, apply tax/VAT, export to **PDF** or **CSV**
- Adjustable **steel density** for non-mild grades
- **Dark / light** themes, **English / العربية** (RTL) — your setup is saved in the browser

## How weights are calculated

Weight = cross-sectional area × length × density (default **7850 kg/m³**, mild steel).

| Section        | Formula (mm, kg/m unless noted) |
|----------------|---------------------------------|
| Round bar      | `π/4 · d² · ρ` |
| Pipe           | `π/4 · (OD² − ID²) · ρ`, `ID = OD − 2t` |
| RHS / SHS      | `[H·B − (H−2t)(B−2t)] · ρ` |
| H / I beam     | `[2·B·tf + (D−2tf)·tw] · ρ` |
| Plate (per pc) | `L · W · t · ρ` (L, W in m; t in mm) |

> **Note on beams:** the plate-area method ignores root fillets, so real rolled sections run roughly 2–4% heavier than the calculated value. For load-bearing or costed work, cross-check against the mill/section table.

## Run it

```bash
git clone https://github.com/<your-username>/steelcalc.git
cd steelcalc
# open index.html in a browser, or serve it:
python3 -m http.server 8000   # then visit http://localhost:8000
```

### Deploy to GitHub Pages
Push the repo, then in **Settings → Pages** set the source to the `main` branch (root). It'll be live at `https://<your-username>.github.io/steelcalc/`.

## Project structure

```
steelcalc/
├── index.html        # markup + panels
├── css/styles.css    # theme, layout, responsive
├── js/
│   ├── steel.js      # pure calculation engine (no DOM — reusable for tests / an API)
│   └── app.js        # UI, quotation, i18n, PDF/CSV export
├── LICENSE
└── README.md
```

`steel.js` is intentionally framework-free and side-effect-free, so the same functions can back the planned REST API or a Node test suite:

```js
const { STEEL } = require('./js/steel.js'); // in browser it's window.STEEL
STEEL.pipePerM(60.3, 3.6);      // → 5.034 kg/m
STEEL.roundBarPerM(25);         // → 3.853 kg/m
STEEL.plateWeight(2, 1, 10);    // → 157 kg per sheet
```

## Roadmap

- [x] Steel weight calculator
- [x] Material cost estimator
- [x] PDF quotation export
- [x] Responsive web interface
- [x] Dark mode
- [x] Multi-language support (English / Arabic, RTL)
- [ ] REST API (engine is ready to wrap)
- [ ] ERP integration

## Contributing

Contributions are welcome. Open an issue or a pull request. Keep the calculation logic inside `js/steel.js` pure and add a note when a formula assumption changes.

## License

MIT — see [LICENSE](LICENSE).
