import { MuseCard } from "./MuseCard";

const priorities = [
  {
    id: 1,
    title: "Finish my project",
    complete: true,
  },
  {
    id: 2,
    title: "Get some movement in",
    complete: false,
  },
  {
    id: 3,
    title: "Plan something lovely",
    complete: false,
  },
];

export function PrioritiesCard() {
  const completed = priorities.filter(
    (priority) => priority.complete
  ).length;

  return (
    <MuseCard>
      <div className="card-heading">
        <h2>Today's priorities</h2>

        <span className="priority-count">
          {completed} / {priorities.length} ✦
        </span>
      </div>

      <div className="priority-list">
        {priorities.map((priority) => (
          <div className="priority-item" key={priority.id}>
            <div
              className={
                priority.complete
                  ? "priority-check complete"
                  : "priority-check"
              }
              aria-hidden="true"
            >
              {priority.complete ? "✓" : ""}
            </div>

            <span>{priority.title}</span>
          </div>
        ))}
      </div>
    </MuseCard>
  );
}