import torch
import yaml
from torch.utils.data import DataLoader
from transformers import ViTForImageClassification, ViTImageProcessor
from peft import LoraConfig, get_peft_model, TaskType
from dataset_loader import Fresh500Dataset
from tqdm import tqdm

# --- LOAD CONFIGURATION ---
with open('scripts/hyperparams.yaml', 'r') as f:
    config = yaml.safe_load(f)

def train_engine():
    print(f"[*] Initializing Training Pipeline for {config['model_name']}...")
    
    # 1. SETUP DEVICE
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Compute Device: {device} (A100 GPU Optimization Enabled)")

    # 2. LOAD FROZEN BACKBONE (ViT-L/16)
    print("[*] Loading Google ViT-L/16 Backbone...")
    model = ViTForImageClassification.from_pretrained(
        config['model_name'],
        num_labels=5, # Fresh, Semi-fresh, Ripe, Overripe, Rotten
        ignore_mismatched_sizes=True
    )

    # 3. APPLY LoRA (Low-Rank Adaptation) - PHASE 2 STRATEGY
    # We freeze the main weights and only train small adapter layers
    peft_config = LoraConfig(
        task_type=TaskType.IMAGE_CLASSIFICATION,
        inference_mode=False,
        r=16,            # Rank
        lora_alpha=32,   # Scaling
        lora_dropout=0.1,
        target_modules=["query", "value"] # Apply to Attention Mechanism
    )
    
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters() # PROOF: Shows we are efficient
    model.to(device)

    # 4. DATA LOADER
    processor = ViTImageProcessor.from_pretrained(config['model_name'])
    train_dataset = Fresh500Dataset(root_dir=config['data_path'], processor=processor, split='train')
    train_loader = DataLoader(train_dataset, batch_size=config['batch_size'], shuffle=True)

    # 5. OPTIMIZER
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(config['learning_rate']))
    criterion = torch.nn.CrossEntropyLoss()

    # 6. TRAINING LOOP
    print("[*] Starting Epochs...")
    model.train()
    for epoch in range(config['epochs']):
        loop = tqdm(train_loader, leave=True)
        for batch in loop:
            # Move to GPU
            pixel_values = batch['pixel_values'].to(device)
            labels = batch['labels'].to(device)

            # Forward Pass
            outputs = model(pixel_values=pixel_values, labels=labels)
            loss = outputs.loss

            # Backward Pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            loop.set_description(f"Epoch {epoch+1}/{config['epochs']}")
            loop.set_postfix(loss=loss.item())

    # 7. SAVE ADAPTERS
    print("[*] Saving LoRA Adapters to ./weights/vit-l16-fresh-lora")
    model.save_pretrained("./weights/vit-l16-fresh-lora")

if __name__ == "__main__":
    train_engine()