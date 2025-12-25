# Tray Animation Processing

## Rename frames

```bash
cd old && for i in {1..19}; do mv "tray-animation-$i.png" "frame-$i.png"; done
```

## Boost alpha + blend with tray-default

```bash
cd old && for i in {1..19}; do
  magick "frame-$i.png" \
    -channel A -level 0%,70% +channel \
    ../tray-default.png \
    -compose Blend -define compose:args=70,30 \
    -composite "frame-$i.png"
done
```

- `-channel A -level 0%,70%` boosts the alpha (70% opacity becomes 100%)
- `-compose Blend -define compose:args=70,30` blends 70% frame + 30% tray-default



