"use client";

import Breadcrumb from "@/components/ComponentHeader/ComponentHeader";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import MoleculeStructure from "../../components/MoleculeStructure";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  createMoleculeGenerationHistory,
  getMoleculeGenerationHistoryByUser,
} from "@/lib/actions/molecule-generation.actions";
import { getUserByEmail } from "@/lib/actions/user.actions";

type GeneratedMol = {
  id: string;
  structure: string;
  score: number;
};

const ModalLayout = () => {
  const { data: session } = useSession();

  const [smiles, setSmiles] = useState(
    "CCN(CC)C(=O)[C@@]1(C)Nc2c(ccc3ccccc23)C[C@H]1N(C)C",
  );
  const [numMolecules, setNumMolecules] = useState("10");
  const [minSimilarity, setMinSimilarity] = useState("0.3");
  const [particles, setParticles] = useState("30");
  const [iterations, setIterations] = useState("10");

  const [molecules, setMolecules] = useState<GeneratedMol[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ================= USER + HISTORY =================
  useEffect(() => {
    if (!session?.user?.email) return;

    const email = session.user.email;
    if (typeof email !== "string") return;

    (async () => {
      try {
        const user = await getUserByEmail(email);
        setUserId(user._id);

        const historyFromServer = await getMoleculeGenerationHistoryByUser(
          user._id,
        );

        setHistory(historyFromServer);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [session?.user?.email]);

  // ================= GENERATE =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMolecules([]);

    const payload = {
      algorithm: "CMA-ES",
      num_molecules: Number(numMolecules),
      property_name: "QED",
      minimize: false,
      min_similarity: Number(minSimilarity),
      particles: Number(particles),
      iterations: Number(iterations),
      smi: smiles.trim(),
    };

    try {
      // ✅ CALL YOUR SERVER (NOT NVIDIA DIRECTLY)
      const res = await fetch("/api/generate-molecules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();

      const generated: GeneratedMol[] = JSON.parse(data.molecules)
        .map((m: any, i: number) => ({
          id: `mol-${Date.now()}-${i}`,
          structure: m.sample?.trim(),
          score: m.score,
        }))
        .filter((m: GeneratedMol) => m.structure);

      setMolecules(generated);

      if (userId) {
        await createMoleculeGenerationHistory(
          {
            smiles,
            numMolecules: Number(numMolecules),
            minSimilarity: Number(minSimilarity),
            particles: Number(particles),
            iterations: Number(iterations),
            generatedMolecules: generated,
          },
          userId,
        );

        setHistory(await getMoleculeGenerationHistoryByUser(userId));
      }
    } catch (err) {
      console.error("Generation failed:", err);
      alert("Generation failed. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  // ================= UI =================
  return (
    <DefaultLayout>
      <Breadcrumb pageName="Generate Molecules" />

      <div className="grid grid-cols-1 gap-9 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="rounded-lg border bg-white dark:bg-[#181818]">
            <div className="border-b px-6 py-4">
              <h3 className="font-medium">SMILES to Molecule Generator</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <input
                value={smiles}
                onChange={(e) => setSmiles(e.target.value)}
                className="w-full rounded border p-3"
                placeholder="SMILES"
              />

              <input
                value={numMolecules}
                onChange={(e) => setNumMolecules(e.target.value)}
                className="w-full rounded border p-3"
                placeholder="Number of molecules"
              />

              <input
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(e.target.value)}
                className="w-full rounded border p-3"
                placeholder="Min similarity"
              />

              <input
                value={particles}
                onChange={(e) => setParticles(e.target.value)}
                className="w-full rounded border p-3"
                placeholder="Particles"
              />

              <input
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
                className="w-full rounded border p-3"
                placeholder="Iterations"
              />

              <button
                disabled={loading}
                className="w-full rounded bg-primary p-3 text-white"
              >
                {loading ? "Generating..." : "Generate Molecules"}
              </button>
            </form>
          </div>
        </div>

        {/* HISTORY */}
        <div className="rounded-lg border bg-white p-4 dark:bg-[#181818]">
          <h3 className="mb-3 font-medium">History</h3>
          {history.map((h, i) => (
            <div key={i} className="border-b py-2">
              <p className="text-sm">{h.smiles}</p>
              <button
                className="text-sm text-primary"
                onClick={() => setMolecules(h.generatedMolecules)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RESULTS */}
      {molecules.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {molecules.map((m) => (
            <MoleculeStructure
              key={m.id}
              id={m.id}
              structure={m.structure}
              scores={m.score}
            />
          ))}
        </div>
      )}
    </DefaultLayout>
  );
};

export default ModalLayout;
