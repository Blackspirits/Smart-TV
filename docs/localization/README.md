# Portuguese interface locales

Maintain European Portuguese in `packages/app/resources/pt-PT/strings.json` and
Brazilian Portuguese in `packages/app/resources/pt-BR/strings.json`. The generic
`pt` resource is a compatibility alias derived from European Portuguese, not a
third translation to maintain.

## Weblate setup

Merging this change does not remove Portuguese (`pt`) from Weblate. The component
scans `packages/app/resources/*/strings.json`, which still includes the
compatibility file.

A Weblate project administrator should exclude the exact `pt` code in the
component's **Language filter**. With the default filter, use
`^(?!pt$)[^.]+$`; if there are already custom exclusions, add `pt` to those
instead. Keep `pt-PT` and `pt-BR` enabled.

Preserve any useful translations or suggestions before retiring the existing
generic Portuguese entry. If it remains listed after rescanning, lock or remove
that translation in Weblate. Keep `resources/pt/strings.json` in Git: it is
generated from `pt-PT` for compatibility and should not be translated separately.

See the [Weblate language filter documentation](https://docs.weblate.org/en/latest/admin/projects.html#component-languagefilter).

## Importing translations

After importing translations from Weblate, run:

```sh
npm run sync:portuguese
```

The script does not modify Brazilian Portuguese. Its existing translations and
English fallbacks are explicit, preventing Brazilian users from inheriting the
new European Portuguese base resource.

Startup, saved settings and imported profiles normalize `pt` and `pt_PT` to
`pt-PT`, and `pt_BR` to `pt-BR`. The picker offers Portugal and Brazil. Audio and
subtitle preferences remain independent of the interface language.

## Translator follow-up

English sentences are also lookup keys in this client. The corrected source keys
have been migrated in calls and in other locales while preserving translations.
This preserves lookup behavior, but does not correct every language's wording.

`translation-review.tsv` lists preserved translations whose meaning should be
checked against the updated source. For the existing `{count} seasons` collisions
in Finnish and Brazilian Portuguese, the existing canonical translation wins.

Import the source, migrated keys and translations together when integrating this
change with Weblate, and treat the generic `pt` resource as derived from `pt-PT`.
