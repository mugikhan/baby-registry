import { useState } from "react";
import { Check, CircleDot, Circle, ExternalLink, Heart, Users } from "lucide-react";
import { AirmailEdge } from "@/components/AirmailEdge";
import { Button } from "@/components/ui/button";
import { Postmark } from "@/components/Postmark";
import { getItemState, getPicture, joinNames } from "@/lib/item-state";
import type { Category, RegistryItem } from "@/lib/sample-items";

type ItemCardProps = {
  item: RegistryItem;
  category?: Category;
  justTaken?: boolean;
};

function Status({ item }: ItemCardProps) {
  const state = getItemState(item);
  const left = item.qty - item.takenBy.length;
  const base = "mt-2 flex items-center gap-2 text-[16px] font-semibold text-ocean-muted";
  const icon = "size-5 shrink-0";

  if (state === "yours") {
    return (
      <p className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-airmail px-2.5 py-1 text-[16px] font-bold whitespace-nowrap text-white">
        <Heart aria-hidden="true" className="size-4 shrink-0 fill-current" />
        You're bringing this
      </p>
    );
  }
  if (state === "taken") {
    return (
      <p className={base}>
        <Check aria-hidden="true" className={icon} />
        Taken by {joinNames(item.takenBy)}
      </p>
    );
  }
  if (state === "partly") {
    return (
      <p className={base}>
        <CircleDot aria-hidden="true" className={icon} />
        <span>
          <span className="tabular-nums">
            {left} of {item.qty}
          </span>{" "}
          still needed
        </span>
      </p>
    );
  }
  if (state === "fund") {
    const givers = item.givers ?? 0;
    return (
      <p className={base}>
        <Users aria-hidden="true" className={icon} />
        <span>
          <span className="tabular-nums">{givers}</span> {givers === 1 ? "person is" : "people are"}{" "}
          giving
        </span>
      </p>
    );
  }
  return (
    <p className={base}>
      <Circle aria-hidden="true" className={icon} />
      Still needed
    </p>
  );
}

function Picture({ item, category }: ItemCardProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = item.photoUrl && !failed;

  return (
    <div className="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-lg bg-sand-pale text-4xl">
      {showPhoto ? (
        <img
          src={item.photoUrl}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{getPicture(item, category)}</span>
      )}
    </div>
  );
}

export function ItemCard({ item, category, justTaken = false }: ItemCardProps) {
  const state = getItemState(item);
  const taken = state === "taken";
  const buttonLabel = {
    needed: "I'll bring this",
    partly: "I'll bring this",
    taken: "Taken",
    yours: "I can't bring this anymore",
    fund: "Give cash",
  }[state];

  return (
    <article
      className={`relative flex flex-col rounded-[10px] p-4 shadow-[0_1px_2px_rgb(15_76_110/0.25)] ${
        taken ? "bg-stone" : "bg-sand"
      } ${state === "yours" ? "pt-6" : ""}`}
    >
      {state === "yours" ? (
        <AirmailEdge className="absolute inset-x-0 top-0 h-2 rounded-t-[10px] [--edge-gap:var(--sand)]" />
      ) : null}
      <div className={`flex flex-1 flex-col gap-3.5 ${taken ? "grayscale" : ""}`}>
        <div className="flex gap-3.5">
          <Picture item={item} category={category} />
          <div className="min-w-0">
            <h2 className="text-[20px] leading-tight font-bold text-ink">{item.title}</h2>
            <div className={taken ? "min-h-[88px] pr-[96px]" : ""}>
              <p className="mt-1 text-[16px] text-ocean-muted">{item.note}</p>
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-12 items-center gap-1.5 text-[16px] font-semibold text-ocean underline"
                >
                  See an example
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              ) : null}
              {taken ? null : <Status item={item} category={category} />}
            </div>
            {taken ? <Status item={item} category={category} /> : null}
          </div>
        </div>
        <Button
          type="button"
          disabled={taken}
          variant={state === "yours" ? "outline" : "default"}
          className={`mt-auto h-12 w-full rounded-xl text-[18px] font-bold ${
            state === "yours"
              ? "border-2 border-ocean bg-transparent text-ocean hover:bg-sand-deep"
              : "bg-ocean text-white hover:bg-ocean-hover active:bg-ocean-pressed"
          } disabled:bg-stone-deep disabled:text-ocean-muted disabled:opacity-100`}
        >
          {buttonLabel}
        </Button>
      </div>
      {taken ? <Postmark names={item.takenBy} date={item.takenOn} animate={justTaken} /> : null}
    </article>
  );
}
