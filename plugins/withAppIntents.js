const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAppIntents = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const projectName = config.modRequest.projectName;
    
    const srcPath = path.join(projectRoot, 'ios-src', 'AddExpenseIntent.swift');
    const destPath = path.join(projectRoot, 'ios', 'AddExpenseIntent.swift');
    
    if (!fs.existsSync(srcPath)) {
      console.warn('AddExpenseIntent.swift not found');
      return config;
    }

    fs.copyFileSync(srcPath, destPath);
    
    // Add to PBXGroup
    const groupKey = xcodeProject.findPBXGroupKey({ name: projectName });
    if (!groupKey) {
      console.warn('Could not find PBXGroup for', projectName);
      return config;
    }
    
    // Check if it's already added to avoid duplicates
    const fileExists = Object.values(xcodeProject.pbxFileReferenceSection()).some(
      (file) => file.name === 'AddExpenseIntent.swift' || file.path === 'AddExpenseIntent.swift'
    );
    
    if (!fileExists) {
      // Add the source file to the project
      xcodeProject.addSourceFile('AddExpenseIntent.swift', { target: xcodeProject.getFirstTarget().uuid }, groupKey);
    }
    
    return config;
  });
};

module.exports = withAppIntents;
