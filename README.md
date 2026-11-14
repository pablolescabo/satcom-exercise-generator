# SatCom Exercise Generator

Unlimited practice problems for a graduate **Satellite Communications** course (NTHU, Chapters 3–9; formulas follow Maral & Bousquet).
**Live version:** https://pablolescabo.github.io/satcom-exercise-generator/

Each click draws new random values, checks your answers, and shows a step-by-step solution.

**39 exercise types**:
- CH3: DSI, ARQ, availability, DVB-S multiplex, 5QI
- CH4: code rate, BPSK, RS interleaving, 64-QAM, DVB-S2, ACM
- CH5: antennas, Friis, rain, link budget, overall C/N0, regenerative repeaters, optical ISL
- CH6: FDMA back-off, TDMA, synchronization, CDMA, Erlang B, ALOHA
- CH7: mesh vs star, SS-TDMA, scanning beams, DVB-RCS, TCP
- CH8: optimum diameter, off-axis density, XPD, look angles, tracking
- CH9: G/T vs EIRP, two-tone IM, back-off, slot switching, coverage

## Use
Open `index.html` in any browser (single file, no dependencies, works offline).
- **Practice values**: loads the original numbers of the practice problem.
- **Seeds**: every exercise has a seed, and links like `index.html#look-123` share the exact same problem.
- **Answer tolerance**: ±0.05 dB for dB values, ±1% otherwise, exact for integers.

## Develop
`engine.js` holds all generators. Each one is `{id, ch, title, rand(R), practice, build(p)}`.
`node test.js` checks that every generator reproduces the practice answers and runs 400 random draws per generator without producing NaN.
After editing `engine.js`, paste its content into the `<script>` block of `index.html`.

Found an error? Open an issue or a pull request.

## License
MIT
