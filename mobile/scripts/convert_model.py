#!/usr/bin/env python3
"""
Convert all-MiniLM-L6-v2 to TFLite for on-device query embedding.

Usage:
  pip install transformers tensorflow tf2onnx onnx tflite
  python mobile/scripts/convert_model.py

Outputs:
  mobile/assets/model/all-MiniLM-L6-v2.tflite
  mobile/assets/model/vocab.txt
"""

from pathlib import Path

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
OUT_DIR = Path(__file__).resolve().parents[1] / "assets" / "model"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Step 1/3: Downloading model and tokenizer…")
    try:
        from transformers import AutoTokenizer
        import torch
    except ImportError:
        print("ERROR: pip install transformers torch")
        raise

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    # Save vocab.txt for the Dart WordPiece tokenizer
    vocab_file = OUT_DIR / "vocab.txt"
    vocab = tokenizer.get_vocab()
    # Write in order of token id
    ordered = sorted(vocab.items(), key=lambda x: x[1])
    with open(vocab_file, "w") as f:
        for token, _ in ordered:
            f.write(token + "\n")
    print(f"  vocab.txt saved ({len(ordered)} tokens)")

    print("Step 2/3: Exporting to ONNX…")
    try:
        from transformers import AutoModel
        import onnx
    except ImportError:
        print("ERROR: pip install onnx optimum[exporters]")
        raise

    # Use optimum for clean export
    try:
        from optimum.exporters.onnx import main_export
        onnx_dir = OUT_DIR / "onnx_tmp"
        main_export(MODEL_NAME, output=onnx_dir, task="feature-extraction")
        onnx_path = onnx_dir / "model.onnx"
    except Exception as e:
        print(f"  optimum export failed ({e}), trying manual…")
        onnx_path = _manual_onnx_export(tokenizer, OUT_DIR)

    print("Step 3/3: Converting ONNX → TFLite…")
    _onnx_to_tflite(onnx_path, OUT_DIR / "all-MiniLM-L6-v2.tflite")

    print(f"\n✓ Model ready at {OUT_DIR}")
    print("  → Copy assets/model/ into your Flutter project")


def _manual_onnx_export(tokenizer, out_dir: Path) -> Path:
    """Fallback: manual PyTorch → ONNX export."""
    import torch
    from transformers import AutoModel

    model = AutoModel.from_pretrained(MODEL_NAME)
    model.eval()

    # Dummy input (batch=1, seq_len=128)
    dummy = tokenizer(
        "Buddhist teachings",
        return_tensors="pt",
        max_length=128,
        padding="max_length",
        truncation=True,
    )

    onnx_path = out_dir / "model.onnx"
    torch.onnx.export(
        model,
        (dummy["input_ids"], dummy["attention_mask"], dummy["token_type_ids"]),
        str(onnx_path),
        input_names=["input_ids", "attention_mask", "token_type_ids"],
        output_names=["last_hidden_state"],
        dynamic_axes={
            "input_ids": {0: "batch"},
            "attention_mask": {0: "batch"},
            "token_type_ids": {0: "batch"},
            "last_hidden_state": {0: "batch"},
        },
        opset_version=14,
    )
    print(f"  ONNX model saved to {onnx_path}")
    return onnx_path


def _onnx_to_tflite(onnx_path: Path, tflite_out: Path) -> None:
    """Convert ONNX → TFLite via tf2onnx + tensorflow."""
    try:
        import subprocess
        result = subprocess.run(
            [
                "python", "-m", "tf2onnx.convert",
                "--onnx", str(onnx_path),
                "--output", str(tflite_out.with_suffix(".pb")),
                "--tflite", str(tflite_out),
            ],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr)
        print(f"  TFLite model: {tflite_out}")
    except Exception as e:
        print(f"\n  ⚠️  TFLite conversion failed: {e}")
        print("  Alternative: use ONNX Runtime Flutter instead.")
        print("  See: https://pub.dev/packages/onnxruntime")
        print(f"  ONNX model is at: {onnx_path}")


if __name__ == "__main__":
    main()
