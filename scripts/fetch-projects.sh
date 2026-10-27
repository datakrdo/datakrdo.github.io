#!/usr/bin/env bash
# Writes data/projects.json with the public repos of the user that carry the topic "portfolio",
# and prepares each project's thumbnails in data/img/ (configured in data/overrides.json):
#   image / image_es          path of a picture inside the repo (same file for light and dark theme)
#   static / static_es        prefix of pictures kept in data/static/ (<prefix>-light.png, <prefix>-dark.png)
#   gallery                   list of extra pictures for the case viewer (see the gallery block below)
#   screenshot / screenshot_es  live URL, captured once per theme (light + dark)
#   screenshot_scroll / screenshot_scroll_es  CSS selector to scroll to before capturing (lazy-rendered charts)
#   hidden                    true = leave the project out
set -euo pipefail
USER_LOGIN="${1:-datakrdo}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$HERE/data"
mkdir -p "$DATA/img"

gh api graphql -f q="user:$USER_LOGIN topic:portfolio is:public fork:false archived:false" -f query='
query($q: String!) {
  search(query: $q, type: REPOSITORY, first: 50) {
    nodes { ... on Repository {
      name url description homepageUrl pushedAt
      primaryLanguage { name }
      repositoryTopics(first: 20) { nodes { topic { name } } }
    } }
  }
}' | jq --slurpfile ov "$DATA/overrides.json" '[.data.search.nodes[]
  | {name, url, description, homepage: (.homepageUrl // ""), pushedAt,
     language: .primaryLanguage.name,
     topics: [.repositoryTopics.nodes[].topic.name | select(. != "portfolio")]}
  | select(.name != "portfolio" and .name != "'"$USER_LOGIN"'.github.io")
  | select(($ov[0][.name].hidden // false) | not)]
  | sort_by(.pushedAt) | reverse' > "$DATA/projects.json"

images='{}'
ov() { jq -r --arg n "$1" --arg k "$2" '.[$n][$k] // empty' "$DATA/overrides.json"; }
add() { images=$(jq --arg n "$1" --arg l "$2" --arg t "$3" --arg f "data/img/$4" '.[$n][$l][$t]=$f' <<<"$images"); }
shrink() { # <in> <out>: max 960 px wide; GIFs keep their animation at reduced size
  case "$2" in
    *.gif) ffmpeg -y -loglevel error -i "$1" -vf "fps=8,scale='min(720,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" "$2" ;;
    *) ffmpeg -y -loglevel error -i "$1" -vf "scale='min(960,iw)':-2" "$2" ;;
  esac
}

for name in $(jq -r '.[].name' "$DATA/projects.json"); do
  for lang in en es; do
    sfx=""; [ "$lang" = es ] && sfx="_es"
    src=$(ov "$name" "image$sfx"); url=$(ov "$name" "screenshot$sfx"); stat=$(ov "$name" "static$sfx")
    if [ -n "$stat" ]; then
      # pictures versioned in this repo: data/static/<stat>-light.png and <stat>-dark.png
      for theme in light dark; do
        cp "$DATA/static/$stat-$theme.png" "$DATA/img/$name-$lang-$theme.png"; add "$name" "$lang" "$theme" "$name-$lang-$theme.png"
      done
    elif [ -n "$src" ]; then
      ext="${src##*.}"; [ "$ext" = webp ] && ext=jpg
      out="$name-$lang.$ext"
      curl -fsSL "https://raw.githubusercontent.com/$USER_LOGIN/$name/HEAD/$src" -o "$DATA/img/$out.raw"
      shrink "$DATA/img/$out.raw" "$DATA/img/$out"; rm "$DATA/img/$out.raw"
      add "$name" "$lang" light "$out"; add "$name" "$lang" dark "$out"
    elif [ -n "$url" ]; then
      for theme in light dark; do
        out="$name-$lang-$theme.png"
        if node "$HERE/scripts/screenshot.mjs" "$url" 1280 853 14000 "$DATA/img/$out.raw" "$theme" "$(ov "$name" "screenshot_scroll$sfx")" \
           && shrink "$DATA/img/$out.raw" "$DATA/img/$out"; then add "$name" "$lang" "$theme" "$out"
        else echo "screenshot failed: $url ($theme)" >&2; fi
        rm -f "$DATA/img/$out.raw"
      done
    fi
  done
done
# Gallery: overrides[<name>].gallery items, each with src (path in the repo) | file (in data/static) | screenshot (+ scroll),
# optional *_es variants and caption/caption_es. Result: projects.json gallery.<lang>[] = {light, dark, caption}.
gallery='{}'
shrinkg() { # <in> <out>: gallery pictures keep up to 1600 px so dense charts stay readable
  case "$2" in
    *.gif) shrink "$1" "$2" ;;
    *) ffmpeg -y -loglevel error -i "$1" -vf "scale='min(1600,iw)':-2" "$2" ;;
  esac
}
for name in $(jq -r '.[].name' "$DATA/projects.json"); do
  count=$(jq -r --arg n "$name" '.[$n].gallery // [] | length' "$DATA/overrides.json")
  for i in $(seq 0 $((count - 1))); do
    for lang in en es; do
      sfx=""; [ "$lang" = es ] && sfx="_es"
      gk() { v=$(jq -r --arg n "$name" --argjson i "$i" --arg k "$1$sfx" '.[$n].gallery[$i][$k] // empty' "$DATA/overrides.json"); [ -n "$v" ] || v=$(jq -r --arg n "$name" --argjson i "$i" --arg k "$1" '.[$n].gallery[$i][$k] // empty' "$DATA/overrides.json"); echo "$v"; }
      src=$(gk src); file=$(gk file); url=$(gk screenshot); cap=$(gk caption)
      base="$name-g$i-$lang"; light=""; dark=""
      if [ -n "$file" ]; then
        ext="${file##*.}"; shrinkg "$DATA/static/$file" "$DATA/img/$base.$ext" && light="data/img/$base.$ext" && dark="$light"
      elif [ -n "$src" ]; then
        ext="${src##*.}"
        curl -fsSL "https://raw.githubusercontent.com/$USER_LOGIN/$name/HEAD/$src" -o "$DATA/img/$base.raw" \
          && shrinkg "$DATA/img/$base.raw" "$DATA/img/$base.$ext" && light="data/img/$base.$ext" && dark="$light"
        rm -f "$DATA/img/$base.raw"
      elif [ -n "$url" ]; then
        for theme in light dark; do
          if node "$HERE/scripts/screenshot.mjs" "$url" 1280 853 14000 "$DATA/img/$base-$theme.raw" "$theme" "$(gk scroll)" \
             && shrinkg "$DATA/img/$base-$theme.raw" "$DATA/img/$base-$theme.png"; then
            [ "$theme" = light ] && light="data/img/$base-light.png" || dark="data/img/$base-dark.png"
          else echo "gallery screenshot failed: $url ($theme)" >&2; fi
          rm -f "$DATA/img/$base-$theme.raw"
        done
      fi
      [ -n "$light" ] && [ -n "$dark" ] && gallery=$(jq --arg n "$name" --arg l "$lang" --arg a "$light" --arg d "$dark" --arg c "$cap" '.[$n][$l] += [{light:$a, dark:$d, caption:$c}]' <<<"$gallery")
    done
  done
done

jq --argjson im "$images" --argjson ga "$gallery" 'map(. + {images: ($im[.name] // {}), gallery: ($ga[.name] // {})})' "$DATA/projects.json" > "$DATA/projects.tmp" && mv "$DATA/projects.tmp" "$DATA/projects.json"
