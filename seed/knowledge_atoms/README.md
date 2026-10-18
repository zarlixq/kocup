# Bilgi atomu seed dosyaları

Bu klasöre `*.json` dosyaları konur (dizi, tek nesne ya da `{ "atoms": [...] }`).
`_` ile başlayan dosyalar yok sayılır.

```json
{ "id": "uuid", "konu_id": "uuid", "konu_adi": "str", "ad": "str", "tip": "formul|kural|kavram|yontem",
  "aciklama": "str (LaTeX olabilir)", "meb_kazanim_kodu": "str|null", "sira": 1,
  "kaynak_url": "str", "related_atom_ids": ["uuid"] }
```

```bash
node scripts/import-knowledge-atoms.mjs            # dry-run (varsayılan, yazmaz)
node scripts/import-knowledge-atoms.mjs --apply    # yazar (idempotent, upsert by id)
```

DB'de olmayan `konu_id`'ler atlanıp raporlanır; konular eklenince tekrar çalıştırın.
