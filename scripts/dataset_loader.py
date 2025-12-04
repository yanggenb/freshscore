import os
import torch
from torch.utils.data import Dataset
from PIL import Image
import pandas as pd

class Fresh500Dataset(Dataset):
    """
    Custom Dataset Loader for the 'Fresh-500' Internal Dataset.
    Handles image preprocessing and label mapping.
    """
    def __init__(self, root_dir, processor, split='train'):
        self.root_dir = root_dir
        self.processor = processor
        self.split = split
        
        # Load annotation index
        # Mocking the CSV read for demonstration
        self.annotations = self._load_mock_annotations()
        
        # Define Label Map
        self.label_map = {
            'Unripe': 0,
            'Semi-fresh': 1,
            'Ripe': 2,
            'Overripe': 3,
            'Rotten': 4
        }

    def _load_mock_annotations(self):
        # In real scenario: return pd.read_csv(os.path.join(self.root_dir, 'labels.csv'))
        return [{'file': f'img_{i}.jpg', 'label': 'Ripe'} for i in range(500)]

    def __len__(self):
        return len(self.annotations)

    def __getitem__(self, idx):
        item = self.annotations[idx]
        img_path = os.path.join(self.root_dir, item['file'])
        label_str = item['label']
        
        # Create dummy image if file doesn't exist (for code demo purposes)
        image = Image.new('RGB', (224, 224), color='red')
        
        # Pre-process image for ViT (Resize, Normalize, Tensor)
        encoding = self.processor(image, return_tensors="pt")
        pixel_values = encoding.pixel_values.squeeze()
        
        label = torch.tensor(self.label_map.get(label_str, 2))

        return {
            'pixel_values': pixel_values,
            'labels': label
        }