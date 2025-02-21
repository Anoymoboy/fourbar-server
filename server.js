/**************************************
 * server.js
 **************************************/
const express = require('express');
const math = require('mathjs');

const app = express();
app.use(express.json());

// Utility: degrees -> radians
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

// Utility: radians -> degrees
function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

// Utility: normalize angle 0–360 (optional)
function normalizeAngle(angleDeg) {
  let a = angleDeg % 360;
  return a < 0 ? a + 360 : a;
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
  if (Math.abs(SL - PQ) < 1e-9) return 'Special Grashof';
  return 'non-Grashof';
}

/**
 * Compute the four-bar open/crossed solutions for theta3 and theta4
 */
function computeFourBar(a, b, c, d, theta2_deg) {
  const theta2 = degToRad(theta2_deg);

  // K values for eqns
  const K1 = d / c; 
  const K2 = d / b;
  const K3 = (a**2 - b**2 + c**2 + d**2) / (2*a*c);

  // A, B, C for the eqn of theta4
  const A = Math.cos(theta2) - K1 - K2 * Math.cos(theta2) + K3;
  const B = -2 * Math.sin(theta2);
  const C = K1 - (K2 - 1) * Math.cos(theta2) + K3;

  console.log('--- theta4 intermediate values ---');
  console.log({
    A,
    B,
    C,
    sqrtTerm: B*B - 4*A*C
  });

  let theta41 = null;
  let theta42 = null;

  // Check if sqrt is negative => imaginary
  const sqrtVal4 = B*B - 4*A*C;
  if (sqrtVal4 < 0) {
    console.log('sqrtTerm < 0 for theta4 => no real solutions. Setting theta4 to null.');
  } else {
    const root4 = math.sqrt(sqrtVal4);

    // open-circuit solution
    const partOpen4 = -B - root4;
    const theta4_1_rad = 2 * Math.atan2(2 * A, partOpen4);
    theta41 = normalizeAngle(radToDeg(theta4_1_rad));

    // crossed-circuit solution
    const partCross4 = -B + root4;
    const theta4_2_rad = 2 * Math.atan2(2 * A, partCross4);
    theta42 = normalizeAngle(radToDeg(theta4_2_rad));
  }

  // Now for theta3
  const K4 = d / b; 
  const K5 = (c**2 - d**2 + a**2 + b**2) / (2*a*b);

  // D, E, F for the eqn of theta3
  const D = Math.cos(theta2) - K4 * Math.cos(theta2) + K5;
  const E = -2 * Math.sin(theta2);
  const F = K4 - (1 - K4) * Math.cos(theta2) + K5;

  console.log('--- theta3 intermediate values ---');
  console.log({
    D,
    E,
    F,
    sqrtTerm: E*E - 4*D*F
  });

  let theta31 = null;
  let theta32 = null;

  // Check if sqrt is negative => imaginary
  const sqrtVal3 = E*E - 4*D*F;
  if (sqrtVal3 < 0) {
    console.log('sqrtTerm < 0 for theta3 => no real solutions. Setting theta3 to null.');
  } else {
    const root3 = math.sqrt(sqrtVal3);

    // open-circuit solution
    const partOpen3 = -E - root3;
    const theta3_1_rad = 2 * Math.atan2(2 * D, partOpen3);
    theta31 = normalizeAngle(radToDeg(theta3_1_rad));

    // crossed-circuit solution
    const partCross3 = -E + root3;
    const theta3_2_rad = 2 * Math.atan2(2 * D, partCross3);
    theta32 = normalizeAngle(radToDeg(theta3_2_rad));
  }

  // Return all angles
  return {
    theta41,
    theta42,
    theta31,
    theta32
  };
}

// POST /compute
app.post('/compute', (req, res) => {
  try {
    const { a, b, c, d, theta2 } = req.body;
    if (a == null || b == null || c == null || d == null || theta2 == null) {
      return res.status(400).json({
        error: 'Missing one of the required fields: a, b, c, d, theta2'
      });
    }

    console.log('Received data:', req.body);

    // 1) Compute angles
    const angles = computeFourBar(a, b, c, d, theta2);

    // 2) Grashof condition
    const grashof = grashofCondition(a, b, c, d);

    // Return JSON
    res.json({
      grashof,
      theta41: angles.theta41,
      theta42: angles.theta42,
      theta31: angles.theta31,
      theta32: angles.theta32
    });
  } catch (err) {
    console.error('Error in /compute:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Listen on process.env.PORT or 3000 for local dev
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});
