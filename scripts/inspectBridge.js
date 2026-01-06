const fs = require('fs');
const path = require('path');

// Simple GLB parser to extract mesh names and basic structure
function inspectGLB(filePath) {
  const buffer = fs.readFileSync(filePath);
  
  // GLB format: 12-byte header + JSON chunk + binary chunk
  // Header: magic (4 bytes), version (4 bytes), length (4 bytes)
  const magic = buffer.toString('utf8', 0, 4);
  if (magic !== 'glTF') {
    console.error('Not a valid GLB file');
    return;
  }
  
  const version = buffer.readUInt32LE(4);
  const length = buffer.readUInt32LE(8);
  
  console.log('=== GLB File Info ===');
  console.log('Version:', version);
  console.log('Total Length:', (length / 1024 / 1024).toFixed(2), 'MB');
  console.log('');
  
  // Read JSON chunk
  let offset = 12;
  const chunkLength = buffer.readUInt32LE(offset);
  const chunkType = buffer.readUInt32LE(offset + 4);
  
  if (chunkType === 0x4E4F534A) { // 'JSON' in ASCII
    const jsonData = buffer.toString('utf8', offset + 8, offset + 8 + chunkLength);
    const gltf = JSON.parse(jsonData);
    
    console.log('=== Scene Structure ===');
    console.log('Scenes:', gltf.scenes?.length || 0);
    console.log('Nodes:', gltf.nodes?.length || 0);
    console.log('Meshes:', gltf.meshes?.length || 0);
    console.log('Materials:', gltf.materials?.length || 0);
    console.log('');
    
    // List all nodes with their names
    console.log('=== Node Hierarchy ===');
    if (gltf.nodes) {
      gltf.nodes.forEach((node, index) => {
        const name = node.name || `Node_${index}`;
        const mesh = node.mesh !== undefined ? `(mesh: ${node.mesh})` : '';
        const children = node.children ? `[${node.children.length} children]` : '';
        const translation = node.translation ? `pos: [${node.translation.map(v => v.toFixed(3)).join(', ')}]` : '';
        const rotation = node.rotation ? `rot: [${node.rotation.map(v => v.toFixed(3)).join(', ')}]` : '';
        const scale = node.scale ? `scale: [${node.scale.map(v => v.toFixed(3)).join(', ')}]` : '';
        
        console.log(`${index}: ${name} ${mesh} ${children} ${translation} ${rotation} ${scale}`);
      });
    }
    console.log('');
    
    // List all materials with details
    console.log('=== Materials ===');
    if (gltf.materials) {
      gltf.materials.forEach((material, index) => {
        const name = material.name || `Material_${index}`;
        console.log(`${index}: ${name}`);
        
        // Show PBR properties
        if (material.pbrMetallicRoughness) {
          const pbr = material.pbrMetallicRoughness;
          if (pbr.baseColorFactor) {
            const color = pbr.baseColorFactor.map(v => (v * 255).toFixed(0));
            console.log(`  - Base Color: rgba(${color.join(', ')})`);
          }
          if (pbr.baseColorTexture) {
            console.log(`  - Has Base Color Texture (index: ${pbr.baseColorTexture.index})`);
          }
          if (pbr.metallicFactor !== undefined) {
            console.log(`  - Metallic: ${pbr.metallicFactor}`);
          }
          if (pbr.roughnessFactor !== undefined) {
            console.log(`  - Roughness: ${pbr.roughnessFactor}`);
          }
        }
        
        // Show other properties
        if (material.emissiveFactor) {
          const emissive = material.emissiveFactor.map(v => (v * 255).toFixed(0));
          console.log(`  - Emissive: rgb(${emissive.join(', ')})`);
        }
        if (material.normalTexture) {
          console.log(`  - Has Normal Map (index: ${material.normalTexture.index})`);
        }
      });
    }
    console.log('');
    
    // Show texture information
    console.log('=== Textures ===');
    if (gltf.textures) {
      console.log(`Total textures: ${gltf.textures.length}`);
      gltf.textures.forEach((texture, index) => {
        const source = texture.source !== undefined ? `source: ${texture.source}` : '';
        const sampler = texture.sampler !== undefined ? `sampler: ${texture.sampler}` : '';
        console.log(`  ${index}: ${source} ${sampler}`);
      });
    } else {
      console.log('No textures found');
    }
    console.log('');
    
    // List all meshes
    console.log('=== Meshes ===');
    if (gltf.meshes) {
      gltf.meshes.forEach((mesh, index) => {
        const name = mesh.name || `Mesh_${index}`;
        const primitives = mesh.primitives?.length || 0;
        console.log(`${index}: ${name} (${primitives} primitives)`);
      });
    }
    console.log('');
    
    // Search for captain's chair related nodes
    console.log('=== Searching for Captain\'s Chair ===');
    const chairKeywords = ['captain', 'chair', 'seat', 'command', 'center'];
    const potentialChairs = [];
    
    if (gltf.nodes) {
      gltf.nodes.forEach((node, index) => {
        const name = (node.name || '').toLowerCase();
        if (chairKeywords.some(keyword => name.includes(keyword))) {
          potentialChairs.push({
            index,
            name: node.name,
            translation: node.translation,
            rotation: node.rotation,
            mesh: node.mesh,
          });
        }
      });
    }
    
    if (potentialChairs.length > 0) {
      console.log('Found potential captain\'s chair nodes:');
      potentialChairs.forEach(chair => {
        console.log(`  - Node ${chair.index}: "${chair.name}"`);
        if (chair.translation) {
          console.log(`    Position: [${chair.translation.map(v => v.toFixed(3)).join(', ')}]`);
        }
        if (chair.mesh !== undefined) {
          console.log(`    Mesh index: ${chair.mesh}`);
        }
      });
    } else {
      console.log('No obvious captain\'s chair found by name.');
      console.log('You may need to manually inspect the model in Blender or a 3D viewer.');
    }
    console.log('');
    
    // Look for scene center/bounds
    console.log('=== Bounding Box Estimate ===');
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    if (gltf.nodes) {
      gltf.nodes.forEach(node => {
        if (node.translation) {
          const [x, y, z] = node.translation;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        }
      });
    }
    
    if (isFinite(minX)) {
      console.log(`X: ${minX.toFixed(3)} to ${maxX.toFixed(3)} (center: ${((minX + maxX) / 2).toFixed(3)})`);
      console.log(`Y: ${minY.toFixed(3)} to ${maxY.toFixed(3)} (center: ${((minY + maxY) / 2).toFixed(3)})`);
      console.log(`Z: ${minZ.toFixed(3)} to ${maxZ.toFixed(3)} (center: ${((minZ + maxZ) / 2).toFixed(3)})`);
    }
  }
}

const bridgePath = path.join(__dirname, '..', 'public', 'models', 'bridge.glb');
console.log('Inspecting:', bridgePath);
console.log('');
inspectGLB(bridgePath);
