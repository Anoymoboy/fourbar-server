/**************************************
 * server.js
 **************************************/
const express = require('express');
const math = require('mathjs');

const app = express();
app.use(express.json());

// Utility: convert degrees -> radians
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Utility: convert radians -> degrees
function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Grashof condition check:
 * Let S = min(a, b, c, d)
 *     L = max(a, b, c, d)
 *     PQ = (a + b + c + d) - (S + L)
 * if (S + L < PQ)  => "Grashof"
 * if (S + L = PQ)  => "Special Grashof"
 * else             => "non-Grashof"
 */
function grashofCondition(a, b, c, d) {
  const S = Math.min(a, b, c, d);
  const L = Math.max(a, b, c, d);
  const PQ = (a + b + c + d) - (S + L);
  const SL = S + L;

  if (SL < PQ) return 'Grashof';
  if (Math.abs(SL - PQ) < 1e-9) return 'Special Grashof'; // allow small float tolerance
  return 'non-Grashof';
}

/**
 * Compute the four-bar “open” and “crossed” solutions for theta3 and theta4
 * using one common version of the vector-loop approach.
 */
function computeFourBar(a, b, c, d, theta2_deg) {
  // Convert input angle to radians for math trig
  const theta2 = degToRad(theta2_deg);

  // =============== 1) Compute theta4 (eqn 4.10b-like) ===============

  // Example definitions from references (adapt for your sign conventions):
  // K1 = d/c
  // K2 = d/b
  // K3 = (a^2 - b^2 + c^2 + d^2) / (2*a*c)
  const K1 = d / c;
  const K2 = d / b;
  const K3 = (a ** 2 - b ** 2 + c ** 2 + d ** 2) / (2 * a * c);

  // A = cos(theta2) - K1 - K2*cos(theta2) + K3
  // B = -2*sin(theta2)
  // C = K1 - (K2 - 1)*cos(theta2) + K3
  const A = Math.cos(theta2) - K1 - K2 * Math.cos(theta2) + K3;
  const B = -2 * Math.sin(theta2);
  const C = K1 - (K2 - 1) * Math.cos(theta2) + K3;

  // open-circuit solution
  //   theta4_1 = 2 * atan2(2*A, -B - sqrt(B^2 - 4*A*C))
  const partOpen = -B - math.sqrt(B * B - 4 * A * C);
  const theta4_1_rad = 2 * Math.atan2(2 * A, partOpen);

  // crossed-circuit solution
  //   theta4_2 = 2 * atan2(2*A, -B + sqrt(B^2 - 4*A*C))
  const partCross = -B + math.sqrt(B * B - 4 * A * C);
  const theta4_2_rad = 2 * Math.atan2(2 * A, partCross);

  // Convert back to degrees (clean up any angle beyond ±180 to 0–360 if desired)
  let theta41 = radToDeg(theta4_1_rad);
  let theta42 = radToDeg(theta4_2_rad);

  // =============== 2) Compute theta3 (eqn 4.13-like) ===============

  // Similarly define K4, K5, D, E, F from your references:
  // K4 = d / b   (already have K2 = d/b, so K4 = K2, but let's keep naming clear)
  // K5 = (c^2 - d^2 + a^2 + b^2) / (2*a*b)
  const K4 = d / b; 
  const K5 = (c ** 2 - d ** 2 + a ** 2 + b ** 2) / (2 * a * b);

  // D = cos(theta2) - K4 - ...
  // E = -2 sin(theta2)
  // F = ...
  // The exact expressions can differ, but commonly:
  //   D = cos(theta2) - K4*cos(theta2) + K5
  //   E = -2*sin(theta2)
  //   F = K4 - (1 - K4)*cos(theta2) + K5
  // or so.  Adjust to match your text if needed.
  const D = Math.cos(theta2) - K4 * Math.cos(theta2) + K5;
  const E = -2 * Math.sin(theta2);
  // For instance:
  const F = K4 - (1 - K4) * Math.cos(theta2) + K5;

  // open-circuit solution for theta3
  //   theta3_1 = 2 * atan2(2*D, -E - sqrt(E^2 - 4*D*F))
  const partOpen3 = -E - math.sqrt(E * E - 4 * D * F);
  const theta3_1_rad = 2 * Math.atan2(2 * D, partOpen3);
  let theta31 = radToDeg(theta3_1_rad);

  // crossed-circuit solution for theta3
  //   theta3_2 = 2 * atan2(2*D, -E + sqrt(E^2 - 4*D*F))
  const partCross3 = -E + math.sqrt(E * E - 4 * D * F);
  const theta3_2_rad = 2 * Math.atan2(2 * D, partCross3);
  let theta32 = radToDeg(theta3_2_rad);

  // OPTIONAL: normalize angles to 0–360
  function normalizeAngle(angleDeg) {
    let a = angleDeg % 360;
    return a < 0 ? a + 360 : a;
  }
  theta41 = normalizeAngle(theta41);
  theta42 = normalizeAngle(theta42);
  theta31 = normalizeAngle(theta31);
  theta32 = normalizeAngle(theta32);

  return {
    theta41,
    theta42,
    theta31,
    theta32
  };
}

// Our main endpoint: POST /compute
// Expects JSON like: { "a": <num>, "b": <num>, "c": <num>, "d": <num>, "theta2": <num> }
app.post('/compute', (req, res) => {
  try {
    const { a, b, c, d, theta2 } = req.body;
    if (
      a == null ||
      b == null ||
      c == null ||
      d == null ||
      theta2 == null
    ) {
      return res.status(400).json({
        error: 'Missing one of the required fields: a, b, c, d, theta2'
      });
    }

    // 1) Compute the angles
    const angles = computeFourBar(a, b, c, d, theta2);

    // 2) Compute Grashof condition
    const grashof = grashofCondition(a, b, c, d);

    // Return the result
    return res.json({
      grashof,
      ...angles
    });
  } catch (err) {
    console.error('Error in /compute:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = 3000; // or any port you like
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
