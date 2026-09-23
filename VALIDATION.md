# Version 1 validation checklist

## A. Field detection
- [ ] Click known annual crop field: CSB polygon matches the agricultural unit reasonably.
- [ ] Click orchard: polygon and acreage are plausible.
- [ ] Click non-agricultural land: app correctly enters point/fallback mode.
- [ ] Verify latest CDL code shown by the app against USDA CSB metadata/viewer.

## B. Soil
- [ ] Compare returned map unit/component against Web Soil Survey at 10 known locations.
- [ ] Check FC/WP against `wthirdbar_r` and `wfifteenbar_r` horizon values.
- [ ] Verify weighted profile calculations to 150 cm.
- [ ] Confirm fallback is clearly labeled when SSURGO is outside coverage.

## C. Satellite
- [ ] Compare latest NDVI with Crop-CASMA at the same point/date.
- [ ] Compare SMAP root-zone soil moisture with Crop-CASMA.
- [ ] Confirm NDVI rescaling from Crop-CASMA 0–250 storage to approximately -1 to 1.
- [ ] Confirm missing satellite products lower confidence without breaking the app.

## D. Weather
- [ ] Compare 14-day forecast response against Open-Meteo page/API at 5 locations.
- [ ] Compare daily ETo against CIMIS or another station where available.
- [ ] Confirm precipitation and dates follow the field's local timezone.

## E. Water-balance regression
Create controlled test cases with fixed weather and crop parameters. Compare:
- [ ] TAW = 1000(FC-WP)Zr.
- [ ] RAW = p TAW.
- [ ] Ks = 1 when Dr <= RAW.
- [ ] Ks declines linearly between RAW and TAW.
- [ ] Daily depletion update behaves correctly after ET and rain.
- [ ] Gross irrigation = net irrigation / application efficiency.

## F. pyfao56 comparison
Use a test case with the same crop parameters, soil water limits, weather ETo, and no runoff/deep percolation complexity. Match the browser implementation against pyfao56's root-zone depletion trajectory as closely as the V1 single-Kc simplification permits. Document any expected difference caused by dual-Kc evaporation or other pyfao56 features not yet implemented.
