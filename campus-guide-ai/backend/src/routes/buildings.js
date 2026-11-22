import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/buildings
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        id,
        name,
        type,
        description,
        latitude,
        longitude,
        zone,
        is_verified
      FROM buildings
      WHERE is_hidden = FALSE
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/buildings:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load verified campus buildings.",
    });
  }
});

// GET /api/buildings/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        name,
        type,
        description,
        latitude,
        longitude,
        zone,
        is_verified
      FROM buildings
      WHERE id = $1
        AND is_hidden = FALSE
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Verified campus information is not available for this location.",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("GET /api/buildings/:id:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load this campus location.",
    });
  }
});

export default router;
