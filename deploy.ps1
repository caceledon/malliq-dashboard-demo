try {
    Write-Host "Initializing git repository..."
    git init
    
    Write-Host "Adding files..."
    git add .
    
    Write-Host "Committing changes..."
    git commit -m "feat: initial dashboard commit"
    
    Write-Host "Creating GitHub repository and pushing..."
    gh repo create malliq-dashboard-demo --public --source=. --remote=origin --push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Repository creation failed. It might already exist. Trying to add remote manually..."
        git remote add origin https://github.com/celed/malliq-dashboard-demo.git
        git branch -M main
        git push -u origin main
    }
    
    Write-Host "Building project for production..."
    npx vite build
    
    Write-Host "Deploying to GitHub Pages..."
    npx gh-pages -d dist
    
    Write-Host "Deployment completed successfully!"
} catch {
    Write-Error $_
}
