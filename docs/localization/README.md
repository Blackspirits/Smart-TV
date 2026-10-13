# Portuguese interface locales

Maintain European Portuguese in `packages/app/resources/pt-PT/strings.json` and
Brazilian Portuguese in `packages/app/resources/pt-BR/strings.json`. The generic
`pt` resource is a compatibility alias derived from European Portuguese, not a
third translation to maintain.

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
