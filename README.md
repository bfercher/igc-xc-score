# igc-xc-score for React Native

[![License: LGPL v3](https://img.shields.io/badge/License-LGPL%20v3-blue.svg)](https://www.gnu.org/licenses/lgpl-3.0)

A lean React Native compatible paragliding and hang-gliding XC scoring library in vanilla JS, with no web dependencies and no IGC parser dependency.

This library provides a solver to calculate optimal flight paths and scores according to various competition rules, with a focus on being lightweight and compatible with React Native environments.

Currently FFVL, XContest, FAI and XCLeague scoring rules are implemented, but you can pass your own structure with scoring info.

Changing the multipliers or the closing distances is easy, adding new bounding algorithms is not.

See *scoring-rules.config.js* if you want to modify the rules.

## Features

- ✅ React Native compatible
- ✅ No web dependencies
- ✅ No IGC parser dependency
- ✅ Optimized for mobile use
- ✅ Multiple scoring rule implementations
- ✅ High-precision geographical calculations

## Background

Correctly scoring paragliding XC flights is a rather hard linear optimization problem that remains impossible to correctly solve in a deterministic way for every possible flight.

If you are new to the subject, I suggest you start with the ground-breaking work of Ondřej Palkovský
[Paragliding Competition Tracklog Optimization](http://www.penguin.cz/~ondrap/algorithm.pdf).

The task might seem impossible at first, as the complexity of the general case is *O(n⁵)* and a competition-level flight log will usually contain up to 40,000 or 50,000 records.
To further complicate matters, all calculations happen in a non-euclidean space which happens to be the Earth's surface.
Luckily, even if an absolutely universal solution remains impossible, there is usually some internal structure of the solution space.

The worst case of this algorithm remains a *O(n⁴log(n))*, but the average complexity is only *O(n²log³(n))*.
It uses a classical branch and bounding approach with a n³ branching for triangles with a *O(n log(n))* cost function and *n³* branching for 3 turnpoints distance flights with a *O(n)* cost function. Different scoring types run in parallel until they are bounded.
It has really good performance for triangles, but tends to be a little bit slow for long straight flights.

Geographical distances are calculated on a WGS84 ellipsoid (oblate spheroid) according to the FAI's recommendations and FFVL's rules, taking into account not only the curvature of Earth, but also its flattening over the poles. In reality, the additional error incurred from not applying these corrections would be only about 500m for 500km.

This tools tries to be as precise as possible. There is no resampling, no interpolation and only points lying on the flight track log are used as turn points. As such, its run time could be extreme in some cases. Two modes of execution are provided: optimal solution at all costs and bounded-time execution. When running in bounded-time mode the tool will report if it has found the absolutely best solution or if it had to abandon the search due to reaching of the time limit.

***Correctness is considered to be achieved if the additional error induced by the tool itself is inferior to the standard GPS accuracy.***

### Algorithm

The algorithm used has a few key differences to the one described by Ondřej Palkovský in his excellent 2010 paper. The most notable one is that the cardinality of the branching is only 3. The branching is over the 3 turnpoints **expressed in linear coordinates over the flight log records**, thus giving O(n³) basic branching complexity.

The two remaining points - the closing points of the triangle for triangle flights and the start/finish points for the free distance flights, are determined as part of the cost function.

The rationale behind this decision is that both of these problems are well-known and well-studied simple geometric problems.

* Finding the triangle closing points is a classical nearest-neighbor search which can be solved in *O(n log(n))* by a number of different approaches, this tool uses a [packed Hilbert R-tree](https://en.wikipedia.org/wiki/Hilbert_R-tree#Packed_Hilbert_R-trees) provided by [mourner/flatbush](https://github.com/mourner/flatbush), locally compensated for the curvature of Earth. Keep in mind that this distance does not need to be 100% precise, as it is used only for selecting the closest point, the scoring effect of the closing distance is measured by the method described in the following section
* Finding the best start/finish points is a simple minimum/maximum search which is a *O(n)* problem
* Both can be further optimized by keeping the intermediate results in an R-Tree or a Hashmap, shared among all the branches

The only weakness of the current implementation are flights consisting of (nearly) perfectly straight lines. These are in fact impossible to optimize, producing a very large number of (nearly) identical solutions that can not be eliminated and therefore must be calculated in order to guarantee that the obtained result is indeed optimal. For those particular cases there is another possible approach with dynamic programming which has a bounded execution time, on the order of a few minutes for the longest flights. This approach is currently not used since it has a rather detrimental impact on the average execution time and has no real benefits aside some very rare, almost perfectly straight line flights.

The branch selection is breadth-first biased when branching and depth-first biased when bounding.

### Distance between two points on the surface of a WGS84 ellipsoid

The FAI recommended method for computing distance is distance on the surface of a WGS84 ellipsoid. Finding the distance between two points on a WGS84 ellipsoid is not a trivial problem. The ellipsoid surface equations do not have a [closed-form expression](https://en.wikipedia.org/wiki/Elliptic_integral) ([video](https://www.youtube.com/watch?v=5nW3nJhBHL0&t=1041s&ab_channel=Stand-upMaths)) and the distance can not be directly calculated. The currently de-facto standard method for computing it is called [Vincenty's algorithm](https://en.wikipedia.org/wiki/Vincenty%27s_formulae) and it is an iterative solution which makes it computationally very expensive. It is available through the **hp=true** option, giving twice slower execution speed for a much higher precision - which is currently hard-coded at 60cm over the WGS84 reference ellipsoid. If the **hp=true** option is not used, I have settled over a simplified direct formula obtained by Taylor series expansion of the ellipsoid surface equations. This method, which requires 5 cosinus, that can be further reduced to 2 cosinus by using trigonometric identities (contributed by @vic), and 1 square root computation, can be found in FCC's recommendations for computing distances not exceeding 500km. *Keep in mind that this distance is the distance of one leg, and not the whole flight*. It has a typical error of 5m and a maximum error of 10m for 100km which should be acceptable for most paragliding and hang-gliding flights. On flights with exceptionally long legs (such as the French national distance record), the error can be as high as 25m, which is more than the standard GPS error. The method is described here: [Code of Federal Regulations (Annual Edition). Title 47: Telecommunication.](https://www.govinfo.gov/content/pkg/CFR-2016-title47-vol4/pdf/CFR-2016-title47-vol4-sec73-208.pdf) and on also on [Wikipedia](https://en.wikipedia.org/wiki/Geographical_distance). This is the very same formula that was famously mistaken in an [earlier edition](https://www.tvtechnology.com/news/fcc-invents-negative-distance) of the document.

As a side note, while the GPS navigation system coordinates are relative to WGS84, which remains the current widely approved standard, the internal model used has been upgraded to the more recent EGM96, which is a higher-order model (a geoid). The typical error of WGS84 when compared to EGM96 is less than 1m (on the horizontal) which is less than the typical GPS receiver error. Thus WGS84, which is mathematically much simpler to use, will probably stay in use for most practical applications.

##### *En France*

*En France [l'ellipsoïde de référence](https://geodesie.ign.fr/contenu/fichiers/documentation/SRCfrance.pdf) normalisé par l'IGN est le GRS80 pour la métropole et le WGS84 pour les DOM-TOM. Le géoïde utilisé est celui du RGF93. Les deux ellipsoïdes sont absolument équivalents, à moins d'un millimètre près, et l'utilisation des coordonnées WGS84 est admise par l'IGN sans [aucune transformation supplémentaire](https://geodesie.ign.fr/contenu/fichiers/documentation/pedagogiques/TransformationsCoordonneesGeodesiques.pdf).*

### Rounding of the result

No cross-country league has completely unambiguous score and distance rounding rules - in fact only FAI and XContest have any rounding rules at all. Until the leagues decide to resolve the ambiguity, `igc-xc-score` has adopted its own rounding rules:
* All legs and closing distances are rounded separately
* The legs are summed and the penalty is calculated
* The triangle closing, `minSide` and `maxSide` are checked against the rounded results
* The penalty is rounded and it is applied
* The final distance is rounded according to the final rounding rule if there is a special final rounding rule
* The multiplier is applied
* The final score is rounded according to the final rounding rule if there is a special final rounding rule, otherwise it is rounded normally

If you don't have lots of experience with floating point numbers on a computer, keep in mind that some fractional numbers that are round in decimal notation are not round in binary notation. **If you are a simple user of the interface this does not concern you.** If you are using the library to develop 3rd party software and using the raw floating numbers, you should study the example web page or the CLI program - pay attention to `toFixed()` calls - you will need to do the same in your code - or otherwise your users will complain that `99.04` sometimes appears as `99.03999999999999`.

### FAI Records rules

The FAI rules are scored using turnpoints in cylinders according to the FAI Sporting Code Section 7D. As this scoring is very peculiar, very complex and used only for evaluating FAI records, **I have focused only on obtaining a perfect result** and I haven't implemented time-saving optimizations. As a result, this scoring is very slow, taking up to 10 minutes for some flights. If there is more interest in scoring flights with cylinder TPs, and especially if any company or institution is willing to sponsor this work (1 week), it will be possible to greatly speed up this algorithm. If you are interested in contributing the required code yourself, I can provide guidance (for free). The missing part is the bounding of the possible solutions that fails to take into account that the real score will be slightly lower than the simple sum of the legs distances. Thus, the `adjustFAICylinders` has to be adapted to work with the bounding functions to avoid trying huge amounts of useless solutions.

### Launch and landing detection

The tool includes a launch and landing detection based upon a moving average of the vertical and the horizontal (ground) speed. It should correctly segment flight logs containing multiple launches and landings and will score the best flight. It can not distinguish a glider that is completely immobile up in the air for a set period of time (ie, gliding into a wind equal to its airspeed while soaring at its sink rate) from a glider that has landed, but outside of this somewhat rare (and very precarious) situation, or maybe a car climbing a twisty mountain road, it should work well in most typical hike and fly cases. The values, including the number of seconds used for the moving average, can be tweaked in *flight.js*.

## Installation

```bash
# Using npm
npm install igc-xc-score

# Using yarn
yarn add igc-xc-score
```

### Usage in React Native

This library was specifically modified to work in React Native environments without any web dependencies or IGC parser dependencies.

```javascript
// Import the solver in your React Native app
import { solver, scoringRules } from 'igc-xc-score';

// Provide your own flight data - you need to parse IGC files yourself
// The solver expects a flight object with the following structure:
const flight = {
  fixes: [
    // Array of GPS fixes
    { 
      timestamp: 1546866868000,  // Timestamp in milliseconds
      latitude: 47.123,          // Latitude in decimal degrees
      longitude: 8.456,          // Longitude in decimal degrees
      valid: true,               // Whether the fix is valid
      pressureAltitude: 1200,    // Pressure altitude in meters
      gpsAltitude: 1220          // GPS altitude in meters
    },
    // More fixes...
  ]
};

// Run the solver with desired scoring rules
try {
  // Get the optimal solution - note that solver is a generator function
  const best = solver(flight, scoringRules.FFVL, { 
    trim: true,       // Auto-trim the flight to launch/landing
    maxcycle: 5000    // Limit computation time per cycle (good for mobile)
  }).next().value;
  
  // Access the result
  console.log(`Score: ${best.score} points`);
  console.log(`Distance: ${best.scoreInfo.distance} km`);
  
  // The result also contains a GeoJSON with all turnpoints and flight path
  const geoJson = best.geojson();
} catch (error) {
  console.error('Error calculating flight score:', error);
}
```

*solver* is a generator function that can be called multiple times with a maximum execution time. Each successive call will return a better solution if such a solution has been found until an optimal solution is reached.

*solver* accepts the following options in its third argument:
```JS
const default_opt = {
    maxcycle: undefined          // max execution time per cycle in milliseconds (recommended for mobile)
    noflight: false              // do not include the flight track in the geojson output (reduces memory usage)
    invalid: false               // do not filter invalid GPS fixes
    hp: false                    // High Precision mode, use Vincenty's instead of FCC distances, twice slower for a little bit better precision
    trim: false                  // auto-trim the flight to its launch and landing points
};
```

## Program Output

The GeoJSON returned by the solver contains what should be the highest scoring solution. It contains the turnpoints (`tp0`, `tp1`...) elements,
the closing points of the triangle for triangle flights (`cp.in` and `cp.out`), the start and finish points for free distance flights (`ep.start` and `ep.finish`) the distances lines (yellow/green) and the flight path itself.
Every tp/cp element also contains an **r** and a **timestamp** field. These are the number and the timestamp of the corresponding GPS fix and can be used to easily verify the correctness of the output of the program.

```json
"type": "Feature",
"id": "tp0",
"properties": {
    "id": "tp0",
    "r": 3799,
    "timestamp": 1546866868000
},
"geometry": {
    "type": "Point",
    "coordinates": [
        6.641583333333333,
        43.73506666666667
    ]
}
```

## Contributing and adding new scoring rules

*scoring-rules.config.js* is designed to be user-serviceable.

Adding new types of flights requires some basic working knowledge of linear optimization and at least some understanding of the branch and bound algorithm. 

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[LGPL](https://choosealicense.com/licenses/lgpl-3.0/)
