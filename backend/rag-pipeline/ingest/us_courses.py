"""US high-school course content, as a source curriculum ('us-courses').

Why: state standards describe what every student must meet, not what a course
teaches. Maryland lists 71 NGSS statements for all of high-school science, with
no organic chemistry, optics or gas laws, so a Maryland student who took
Chemistry or AP Physics read as a beginner in those subjects. When the form
says which courses a student has taken, the gap engine also matches against
these units (applyCourseMatches in supabase/functions/_shared/curriculumGaps.ts)
and keeps whichever match is better.

Course labels are the exact values the assessment form stores in academicPath
(frontend/src/components/assessment/shared/highSchoolCourses.ts); keep the two
in step.

Sources:
  AP courses        College Board Course and Exam Description unit lists
                    (AP Physics 1 and 2 combined under "AP Physics"; AP Calculus
                    AB and BC combined under "AP Calculus").
  Regular courses   The standard US high-school course outline for each subject,
                    as taught to the state standards it extends.

Usage (from backend/rag-pipeline/):
    python ingest/us_courses.py --dry-run
    python ingest/us_courses.py            # insert new units, then embed
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

CURRICULUM = "us-courses"
AP = "AP (Advanced Placement) "

COURSES: dict[str, list[tuple[str, str]]] = {
    # ── Regular high-school courses ────────────────────────────────────────
    "High School Biology": [
        ("Biochemistry", "Carbohydrates, lipids, proteins and nucleic acids; enzymes and how they work."),
        ("Cell structure and function", "Prokaryotic and eukaryotic cells, organelles, cell membrane and transport."),
        ("Photosynthesis and cellular respiration", "Light and dark reactions, glycolysis, Krebs cycle, ATP."),
        ("Cell division", "Cell cycle, mitosis and meiosis."),
        ("Genetics and heredity", "Mendelian inheritance, Punnett squares, sex-linked traits, pedigrees."),
        ("Molecular genetics", "DNA structure and replication, transcription, translation, mutations."),
        ("Evolution", "Natural selection, evidence for evolution, speciation."),
        ("Classification and diversity of life", "Taxonomy, kingdoms of life, viruses, bacteria, protists, fungi, plants and animals."),
        ("Ecology", "Ecosystems, food webs, energy flow, nutrient cycles, populations and biodiversity."),
        ("Human body systems", "Digestive, circulatory, respiratory, excretory, nervous, endocrine, muscular and skeletal systems."),
        ("Plant structure and function", "Roots, stems, leaves, transport in plants, plant reproduction and growth."),
    ],
    "High School Chemistry": [
        ("Matter and measurement", "Properties of matter, units, significant figures, dimensional analysis."),
        ("Atomic structure", "Subatomic particles, isotopes, atomic models, electron configuration and quantum numbers."),
        ("Periodic table and periodic trends", "Organisation of the periodic table, atomic radius, ionisation energy, electronegativity."),
        ("Chemical bonding and molecular shape", "Ionic, covalent and metallic bonding, Lewis structures, VSEPR, polarity, intermolecular forces."),
        ("Nomenclature and chemical formulas", "Naming ionic and molecular compounds, writing formulas."),
        ("The mole and stoichiometry", "Mole concept, molar mass, percent composition, limiting reagent, percent yield."),
        ("Chemical reactions", "Balancing equations, reaction types, redox reactions and oxidation numbers."),
        ("States of matter and gas laws", "Kinetic molecular theory, Boyle's, Charles's and ideal gas laws."),
        ("Solutions", "Solubility, molarity, dilution, colligative properties."),
        ("Acids and bases", "Acid-base theories, pH, neutralisation and titration."),
        ("Reaction rates and equilibrium", "Collision theory, factors affecting rate, Le Chatelier's principle."),
        ("Thermochemistry", "Endothermic and exothermic reactions, enthalpy, specific heat, Hess's law."),
        ("Introduction to organic chemistry", "Hydrocarbons, functional groups, simple organic nomenclature."),
        ("Nuclear chemistry", "Radioactive decay, half-life, fission and fusion."),
    ],
    "High School Physics": [
        ("Measurement, units and vectors", "SI units, significant figures, scalar and vector quantities, vector addition."),
        ("Kinematics", "Displacement, velocity, acceleration, motion graphs, projectile motion."),
        ("Newton's laws of motion", "Forces, free-body diagrams, friction, inclined planes."),
        ("Work, energy and power", "Work, kinetic and potential energy, conservation of energy, power."),
        ("Momentum and collisions", "Impulse, conservation of momentum, elastic and inelastic collisions."),
        ("Circular motion and gravitation", "Centripetal force, universal gravitation, orbits."),
        ("Oscillations and waves", "Simple harmonic motion, pendulums, springs, wave properties and sound."),
        ("Light and geometric optics", "Reflection, refraction, mirrors, lenses, image formation."),
        ("Electrostatics", "Electric charge, Coulomb's law, electric field and potential."),
        ("Electric circuits", "Current, voltage, resistance, Ohm's law, series and parallel circuits, power."),
        ("Magnetism and electromagnetic induction", "Magnetic fields, forces on currents, Faraday's law, generators and transformers."),
        ("Thermal physics", "Temperature, heat, specific heat, thermal expansion, kinetic theory of gases."),
        ("Modern physics", "Photoelectric effect, atomic structure, nuclear physics and radioactivity."),
    ],
    "Algebra II": [
        ("Functions and their graphs", "Domain, range, transformations, composition and inverse functions."),
        ("Quadratic functions and complex numbers", "Solving quadratics, the discriminant, complex numbers."),
        ("Polynomial functions", "Polynomial operations, factoring, the remainder and factor theorems, graphs."),
        ("Rational and radical functions", "Rational expressions and equations, radical equations."),
        ("Exponential and logarithmic functions", "Exponential growth and decay, logarithms and their properties."),
        ("Sequences and series", "Arithmetic and geometric sequences and series, sigma notation."),
        ("Systems of equations and inequalities", "Linear systems in two and three variables, matrices for systems."),
        ("Trigonometric functions", "Radian measure, the unit circle, graphs of sine and cosine."),
        ("Probability and statistics", "Counting principles, permutations, combinations, probability, normal distribution."),
    ],
    "Precalculus": [
        ("Functions", "Function analysis, composition, inverses, piecewise functions."),
        ("Polynomial and rational functions", "Zeros, end behaviour, asymptotes, graphs."),
        ("Exponential and logarithmic functions", "Properties, equations and modelling."),
        ("Trigonometric functions and identities", "Trigonometric ratios, graphs, identities, equations, laws of sines and cosines."),
        ("Inverse trigonometric functions", "Domains, ranges and principal values of inverse trigonometric functions."),
        ("Vectors", "Vector operations, dot product, vectors in the plane and in space."),
        ("Matrices and determinants", "Matrix operations, determinants, inverse matrices, solving linear systems."),
        ("Conic sections", "Circles, parabolas, ellipses and hyperbolas."),
        ("Sequences, series and the binomial theorem", "Arithmetic and geometric series, mathematical induction, binomial expansion."),
        ("Polar coordinates and parametric equations", "Polar graphs, complex numbers in polar form, parametric curves."),
        ("Introduction to limits", "Limits of functions and continuity."),
    ],
    # ── AP courses (College Board unit lists) ──────────────────────────────
    AP + "Calculus": [
        ("Limits and continuity", "Limits, continuity, asymptotic behaviour, intermediate value theorem."),
        ("Differentiation: definition and fundamental properties", "Derivative as a limit, power, product and quotient rules."),
        ("Differentiation: composite, implicit and inverse functions", "Chain rule, implicit differentiation, derivatives of inverse functions."),
        ("Contextual applications of differentiation", "Rates of change, related rates, linearisation, L'Hospital's rule."),
        ("Analytical applications of differentiation", "Mean value theorem, extrema, increasing and decreasing functions, concavity, optimisation."),
        ("Integration and accumulation of change", "Riemann sums, definite integrals, fundamental theorem of calculus, integration techniques."),
        ("Differential equations", "Slope fields, separation of variables, exponential models."),
        ("Applications of integration", "Average value, area between curves, volumes of solids."),
        ("Parametric equations, polar coordinates and vector-valued functions", "Calculus of parametric, polar and vector functions."),
        ("Infinite sequences and series", "Convergence tests, Taylor and Maclaurin series."),
    ],
    AP + "Statistics": [
        ("Exploring one-variable data", "Distributions, measures of centre and spread, the normal distribution."),
        ("Exploring two-variable data", "Scatterplots, correlation, least-squares regression."),
        ("Collecting data", "Sampling methods, experimental design."),
        ("Probability, random variables and probability distributions", "Probability rules, binomial and geometric distributions."),
        ("Sampling distributions", "Sampling distributions of proportions and means, central limit theorem."),
        ("Statistical inference", "Confidence intervals and significance tests for proportions, means, chi-square and slopes."),
    ],
    AP + "Physics": [
        ("Kinematics", "Motion in one and two dimensions, projectile motion."),
        ("Force and translational dynamics", "Newton's laws, friction, gravitation, circular motion."),
        ("Work, energy and power", "Work-energy theorem, conservation of energy, power."),
        ("Linear momentum", "Impulse, conservation of momentum, collisions, centre of mass."),
        ("Torque and rotational dynamics", "Torque, rotational inertia, angular acceleration, rigid bodies."),
        ("Energy and momentum of rotating systems", "Rotational kinetic energy, angular momentum and its conservation."),
        ("Oscillations", "Simple harmonic motion of springs and pendulums."),
        ("Fluids", "Pressure, buoyancy, fluid flow, Bernoulli's equation."),
        ("Thermodynamics", "Kinetic theory of gases, heat, laws of thermodynamics, thermal processes."),
        ("Electric force, field and potential", "Coulomb's law, electric fields, potential, capacitors."),
        ("Electric circuits", "Current, resistance, Ohm's and Kirchhoff's laws, RC circuits."),
        ("Magnetism and electromagnetism", "Magnetic fields and forces, electromagnetic induction, Faraday's and Lenz's laws."),
        ("Geometric optics", "Reflection, refraction, mirrors and lenses."),
        ("Waves, sound and physical optics", "Wave properties, interference, diffraction, sound."),
        ("Modern physics", "Photoelectric effect, atomic energy levels, nuclear physics, wave-particle duality."),
    ],
    AP + "Chemistry": [
        ("Atomic structure and properties", "Moles, mass spectra, electron configuration, photoelectron spectroscopy, periodic trends."),
        ("Compound structure and properties", "Ionic and covalent bonding, Lewis diagrams, VSEPR, hybridisation."),
        ("Properties of substances and mixtures", "Intermolecular forces, gases and the ideal gas law, solutions and mixtures."),
        ("Chemical reactions", "Net ionic equations, stoichiometry, titration, acid-base and redox reactions."),
        ("Kinetics", "Rate laws, reaction mechanisms, activation energy, catalysis."),
        ("Thermochemistry", "Enthalpy, calorimetry, bond enthalpies, Hess's law."),
        ("Equilibrium", "Equilibrium constants, Le Chatelier's principle, solubility equilibria."),
        ("Acids and bases", "pH, strong and weak acids and bases, buffers, titration curves."),
        ("Thermodynamics and electrochemistry", "Entropy, Gibbs free energy, galvanic and electrolytic cells, cell potential."),
    ],
    AP + "Biology": [
        ("Chemistry of life", "Water, macromolecules, structure and function of biological molecules."),
        ("Cell structure and function", "Organelles, membranes, transport, compartmentalisation."),
        ("Cellular energetics", "Enzymes, photosynthesis, cellular respiration."),
        ("Cell communication and cell cycle", "Signal transduction, feedback, mitosis and its regulation."),
        ("Heredity", "Meiosis, Mendelian genetics, non-Mendelian inheritance."),
        ("Gene expression and regulation", "DNA replication, transcription, translation, gene regulation, biotechnology."),
        ("Natural selection", "Evolution, Hardy-Weinberg equilibrium, speciation, phylogeny."),
        ("Ecology", "Energy flow, populations, communities, ecosystems, biodiversity."),
    ],
    AP + "Computer Science A": [
        ("Primitive types and expressions", "Variables, primitive data types, arithmetic expressions, casting."),
        ("Using objects and methods", "Objects, classes, constructors, calling methods, String and Math classes."),
        ("Boolean expressions and conditionals", "Boolean logic, if statements, compound conditions."),
        ("Iteration", "while and for loops, nested loops, standard algorithms."),
        ("Writing classes", "Class design, instance variables, constructors, methods, encapsulation, static members."),
        ("Arrays and ArrayLists", "One-dimensional arrays, ArrayList, traversals, searching and sorting."),
        ("2D arrays", "Two-dimensional arrays and their traversal."),
        ("Inheritance and polymorphism", "Superclasses, subclasses, overriding, polymorphism."),
        ("Recursion", "Recursive methods, recursive searching and sorting."),
    ],
    AP + "Computer Science Principles": [
        ("Creative development", "Program design, collaboration, identifying and correcting errors."),
        ("Data", "Binary numbers, data compression, extracting information from data."),
        ("Algorithms and programming", "Variables, lists, conditionals, iteration, procedures, algorithm efficiency."),
        ("Computer systems and networks", "The Internet, fault tolerance, parallel and distributed computing."),
        ("Impact of computing", "Beneficial and harmful effects, digital divide, legal and ethical concerns, safe computing."),
    ],
    AP + "English": [
        ("Rhetorical analysis", "Analysing an author's choices, purpose and audience in non-fiction texts."),
        ("Argument writing", "Developing a defensible claim with evidence and reasoning."),
        ("Synthesis writing", "Combining information from several sources into an argument."),
        ("Literary analysis", "Close reading and analysis of prose, poetry and drama: character, structure, figurative language."),
        ("Language and style", "Sentence structure, diction, tone and style in writing."),
    ],
}


def build_nodes() -> list[dict]:
    nodes = []
    for course, units in COURSES.items():
        # "AP (Advanced Placement) X" -> "APX"; unique per course.
        code = "".join(ch for ch in course.replace(AP, "AP ").upper() if ch.isalnum())
        for i, (name, description) in enumerate(units, 1):
            nodes.append({
                "node_type": "topic",
                # The course is in the name because the gap reason quotes it
                # ("Closest match ... was "Electric circuits (High School
                # Physics)""), and reads as state coursework otherwise.
                "name": f"{name} ({course.replace(AP, 'AP ')})",
                "description": description,
                "grade_level_min": 9,
                "grade_level_max": 12,
                "curriculum_system": CURRICULUM,
                "metadata": {
                    "source_id": f"USCOURSE-{code}-U{i}",
                    "source_type": "course_unit",
                    "subject": course,
                    "course": course.replace(AP, "AP "),
                    "embedding_text": f"US high school course {course.replace(AP, 'AP ')} - {name} - {description}",
                },
            })
    return nodes


def main() -> int:
    parser = argparse.ArgumentParser(description="Insert US high-school course units and embed them")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    nodes = build_nodes()
    if args.dry_run:
        for course, units in COURSES.items():
            print(f"{course:<55} {len(units)} units")
        print(f"{len(nodes)} nodes")
        return 0

    from config import INSERT_BATCH_SIZE  # noqa: E402
    from db.supabase_client import batch_insert, get_client, get_existing_source_ids, refresh_subject_index  # noqa: E402
    from generate_embeddings import generate_embeddings  # noqa: E402

    client = get_client()
    existing = get_existing_source_ids(client, CURRICULUM)
    new = [n for n in nodes if n["metadata"]["source_id"] not in existing]
    print(f"{len(nodes)} course units, {len(new)} new")
    if new:
        batch_insert(client, "curriculum_nodes", new, INSERT_BATCH_SIZE)
        refresh_subject_index(client)
    generate_embeddings([CURRICULUM])
    return 0


if __name__ == "__main__":
    sys.exit(main())
