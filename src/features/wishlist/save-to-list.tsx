"use client";

import { Popover } from "@base-ui/react/popover";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSignedIn } from "./shopper-session";
import { useAddToWishlistMutation, useCreateWishlistMutation, useGetWishlistsQuery } from "./wishlist-api";

type Props = { productId: string; variantId?: string; title: string };

// "Save to a list": puts the product (with the chosen option) into one of the customer's named
// wishlists, or a new one. The heart next to it keeps saving to the default list. Signed-in
// customers only; the lists load when the menu opens.
export function SaveToList(props: Props) {
  const signedIn = useSignedIn();
  if (!signedIn) return null;
  return <ListPicker {...props} />;
}

function ListPicker({ productId, variantId, title }: Props) {
  const t = useTranslations("wishlist");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="save-to-list">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="link-btn" data-testid="save-to-list">
          {t("saveToList")}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="start">
            <Popover.Popup className="save-to-list__popup">
              <Popover.Title className="save-to-list__title">{t("saveToListTitle", { title })}</Popover.Title>
              {open && (
                <Lists
                  productId={productId}
                  variantId={variantId}
                  onSaved={(name) => {
                    setMessage(t("savedToList", { title, list: name }));
                    setOpen(false);
                  }}
                />
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {/* always in the page, so screen readers announce the message when it appears */}
      <p className="muted save-to-list__note" role="status">
        {message}
      </p>
    </div>
  );
}

function Lists({
  productId,
  variantId,
  onSaved,
}: {
  productId: string;
  variantId?: string;
  onSaved: (listName: string) => void;
}) {
  const t = useTranslations("wishlist");
  const { data: lists, isLoading } = useGetWishlistsQuery();
  const [add, { isLoading: adding }] = useAddToWishlistMutation();
  const [create, { isLoading: creating }] = useCreateWishlistMutation();
  const [error, setError] = useState("");

  const saveTo = async (id: string, name: string) => {
    setError("");
    const result = await add({ id, productId, variantId });
    if (result.error) setError(t("failed"));
    else onSaved(name);
  };

  const createAndSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return setError(t("nameRequired"));
    const created = await create({ name });
    if (created.error) return setError(t("failed"));
    await saveTo(created.data.id, created.data.name);
  };

  if (isLoading) return <p className="muted">{t("loading")}</p>;
  return (
    <>
      {lists && lists.length > 0 ? (
        <ul className="save-to-list__lists">
          {lists.map((list) => (
            <li key={list.id}>
              <button type="button" disabled={adding} onClick={() => saveTo(list.id, list.name)}>
                <span>{list.name}</span>
                <span className="muted">{list.itemCount}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{t("noListsYet")}</p>
      )}
      <form className="save-to-list__new" onSubmit={createAndSave} noValidate>
        <label htmlFor={`new-list-${productId}`}>{t("newList")}</label>
        <div className="save-to-list__row">
          <input
            id={`new-list-${productId}`}
            className="input"
            name="name"
            maxLength={60}
            placeholder={t("newListPlaceholder")}
          />
          <button className="btn btn--secondary" type="submit" disabled={creating || adding}>
            {t("createAndSave")}
          </button>
        </div>
      </form>
      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
