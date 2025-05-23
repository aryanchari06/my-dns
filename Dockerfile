FROM ubuntu

# Install curl and run the NodeSource setup script
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js 
RUN apt-get install -y nodejs

# Optional: upgrade system packages (you can keep or remove this)
RUN apt-get upgrade -y

# Copy files
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY index.js index.js

# Install Node.js dependencies
RUN npm install

# Run the app
ENTRYPOINT [ "node", "index.js" ]
