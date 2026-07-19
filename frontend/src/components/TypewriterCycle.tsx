import { useState, useEffect } from "react";

const words = ["Worlds", "Curricula", "Systems"];
const TYPING_SPEED = 120;
const PAUSE = 1800;
const DELETE_SPEED = 80;

const TypewriterCycle = () => {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[index];

    if (!deleting && text === word) {
      const t = setTimeout(() => setDeleting(true), PAUSE);
      return () => clearTimeout(t);
    }

    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      return;
    }

    const speed = deleting ? DELETE_SPEED : TYPING_SPEED;
    const t = setTimeout(() => {
      setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, speed);

    return () => clearTimeout(t);
  }, [text, deleting, index]);

  return (
    <span className="text-secondary font-extrabold">
      {text}
      <span className="inline-block w-[3px] h-[1em] bg-secondary ml-0.5 align-middle animate-pulse" />
    </span>
  );
};

export default TypewriterCycle;
