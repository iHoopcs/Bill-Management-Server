# 1. Use an official Node.js runtime as a parent image
FROM node:22-alpine

# 2. Set the working directory in the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json to the working directory & install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the application code to the working directory
COPY . .

#5. Environment variables
ENV PORT=8080
ENV MONGO_URI=mongodb+srv://iHoopcs:kZdAIyWlbASPeXAr@cluster1.gtarcla.mongodb.net/finance-mgmt
ENV JWT_SECRET=your-super-secret-and-long-random-string-that-is-hard-to-guess

# 6. Expose the port the app runs on
EXPOSE $PORT

# 7. Define the command to run the application
CMD ["node", "src/index.js"]