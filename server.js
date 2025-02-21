/**************************************
/**************************************
 * server.js
 * Using your simpler formulas directly
 **************************************/
const express = require('express');
const math = require('mathjs');

const app = express();
app.use(express.json());

const PI = Math.PI;

// Utility: degrees -> radians
function degToRad(deg) {
  return deg * (PI / 180);
}

// Utility: safely do sqrt without crashing if negative
function safeSqrt(val) {
  return val < 0 ? NaN : Math.sqrt(val);
}

app.post('/compute', (req, res) => {
  try {
    const { a, b, c, d, theta2 } = req.body;
    if (a == null || b == null || c == null || d == null || theta2 == null) {
      return res.status(400).json({
        error: 'Missing one of the required fields: a, b, c, d, theta2'
      });
    }

    // 1) Convert theta2 to radians
    const theta2_rad = degToRad(theta2);

    // 2) K values
    const K1 = d / a;
    const K2 = d / c;
    const K3 = (a**2 - b**2 + c**2 + d**2) / (2 * a * c);
    const K4 = d / b;
    const K5 = (c**2 - d**2 - a**2 - b**2) / (2 * a * b);

    // 3) For theta4
    //    A = cos(theta2_rad) - K1 - K2*cos(theta2_rad) + K3
    //    B = -2 * sin(theta2_rad)
    //    C = K1 - (K2 + 1)*cos(theta2_rad) + K3
    const A = Math.cos(theta2_rad) - K1 - K2 * Math.cos(theta2_rad) + K3;
    const B = -2 * Math.sin(theta2_rad);
    const C = K1 - (K2 + 1) * Math.cos(theta2_rad) + K3;

    // discriminant = B^2 - 4AC
    const discriminant = B*B - 4*A*C;
    const sqrtDisc = safeSqrt(discriminant);

    let theta4_1 = null;
    let theta4_2 = null;

    if (!Number.isNaN(sqrtDisc)) {
      // theta4_1 = 2 * atan( (-B - sqrt(discriminant)) / (2*A) ) * (180/pi)
      const rad41 = 2 * Math.atan(
        (-B - sqrtDisc) / (2 * A)
      );
      theta4_1 = rad41 * (180 / PI);

      // theta4_2 = 2 * atan( (-B + sqrt(discriminant)) / (2*A) ) * (180/pi)
      const rad42 = 2 * Math.atan(
        (-B + sqrtDisc) / (2 * A)
      );
      theta4_2 = rad42 * (180 / PI);
    }

    // 4) For theta3
    //    D = cos(theta2_rad) - K1 + K4*cos(theta2_rad) + K5
    //    E = -2*sin(theta2_rad)
    //    F = K1 + (K4 - 1)*cos(theta2_rad) + K5
    const D = Math.cos(theta2_rad) - K1 + K4 * Math.cos(theta2_rad) + K5;
    const E = -2 * Math.sin(theta2_rad);
    const F = K1 + (K4 - 1) * Math.cos(theta2_rad) + K5;

    // discriminant1 = E^2 - 4DF
    const discriminant1 = E*E - 4*D*F;
    const sqrtDisc1 = safeSqrt(discriminant1);

    let theta3_1 = null;
    let theta3_2 = null;

    if (!Number.isNaN(sqrtDisc1)) {
      // theta3_1 = 2 * atan( (-E - sqrt(discriminant1)) / (2*D) ) * (180/pi)
      const rad31 = 2 * Math.atan(
        (-E - sqrtDisc1) / (2 * D)
      );
      theta3_1 = rad31 * (180 / PI);

      // theta3_2 = 2 * atan( (-E + sqrt(discriminant1)) / (2*D) ) * (180/pi)
      const rad32 = 2 * Math.atan(
        (-E + sqrtDisc1) / (2 * D)
      );
      theta3_2 = rad32 * (180 / PI);
    }

    return res.json({
      theta4_1,
      theta4_2,
      theta3_1,
      theta3_2,
      // Optionally, return debug too
      discriminant,
      discriminant1
    });
  } catch (err) {
    console.error('Error in /compute:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
